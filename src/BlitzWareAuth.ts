import {
  BlitzWareAuthParams,
  BlitzWareAuthUser,
  BlitzWareAuthError,
  GetAccessTokenOptions,
} from "./types";
import {
  generateAuthUrl,
  hasAuthParams,
  isTokenValid,
  setToken,
  setState,
  getState,
  fetchUserInfo,
  exchangeCodeForToken,
  generateSecureState,
  logoutFromService,
  clearSession,
} from "./utils";
import { createAccessTokenManager } from "./tokenManager";

export class BlitzWareAuth {
  private authParams: BlitzWareAuthParams;
  private state: string;
  private user: BlitzWareAuthUser | null = null;
  private isAuthenticated = isTokenValid();
  private isLoading: boolean = true;
  private didInitialize = false;
  private accessTokenManager: ReturnType<typeof createAccessTokenManager>;

  constructor(authParams: BlitzWareAuthParams) {
    this.authParams = authParams;
    this.state = getState() || generateSecureState();
    this.accessTokenManager = createAccessTokenManager(authParams, {
      onSessionExpired: () => {
        this.setIsAuthenticated(false);
        this.setUser(null);
      },
      onSessionRefreshed: () => this.setIsAuthenticated(true),
    });
    this.accessTokenManager.start();
  }

  private async initializeAuth(): Promise<void> {
    if (this.didInitialize) return;
    this.didInitialize = true;

    try {
      if (!hasAuthParams()) {
        if (isTokenValid()) {
          const userData = await fetchUserInfo(
            this.authParams.clientId,
            undefined,
            this.authParams.authBaseUrl
          );
          this.setUser(userData);
          this.setIsAuthenticated(true);
        } else {
          try {
            const token = await this.getAccessToken({ minValiditySeconds: 0 });
            if (!token) return;
            const userData = await fetchUserInfo(
              this.authParams.clientId,
              undefined,
              this.authParams.authBaseUrl
            );
            this.setUser(userData);
            this.setIsAuthenticated(true);
          } catch (error) {
            console.error("Authentication refresh failed:", error);
          }
        }
      }
    } catch (error) {
      console.error("Authentication initialization failed:", error);
      clearSession();
      this.setIsAuthenticated(false);
      this.user = null;
    } finally {
      this.setIsLoading(false);
    }
  }

  async handleRedirect(): Promise<void> {
    // Always run initialization first
    await this.initializeAuth();

    try {
      if (hasAuthParams()) {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for error
        const error = urlParams.get("error");
        if (error) {
          const errorDescription = urlParams.get("error_description");
          throw new BlitzWareAuthError(
            errorDescription || `OAuth error: ${error}`,
            error
          );
        }

        const state = urlParams.get("state");
        if (state !== this.state) {
          throw new BlitzWareAuthError(
            "Invalid state parameter",
            "invalid_state"
          );
        }

        const code = urlParams.get("code");
        if (code) {
          // Handle authorization code flow with PKCE
          const tokenResponse = await exchangeCodeForToken(
            code,
            this.authParams.clientId,
            this.authParams.redirectUri,
            this.authParams.authBaseUrl
          );

          // Store tokens
          setToken("access_token", tokenResponse.access_token);
          if (tokenResponse.refresh_token) {
            setToken("refresh_token", tokenResponse.refresh_token);
          }
          if (tokenResponse.id_token) {
            setToken("id_token", tokenResponse.id_token);
          }

          // Fetch user info
          const userData = await fetchUserInfo(
            this.authParams.clientId,
            undefined,
            this.authParams.authBaseUrl
          );
          this.setUser(userData);
          this.setIsAuthenticated(true);

          // Clean URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } else {
          // Handle legacy implicit flow
          const accessToken = urlParams.get("access_token");
          if (accessToken) {
            setToken("access_token", accessToken);

            const userData = await fetchUserInfo(
              this.authParams.clientId,
              undefined,
              this.authParams.authBaseUrl
            );
            this.setUser(userData);
            this.setIsAuthenticated(true);

            const refreshToken = urlParams.get("refresh_token");
            if (refreshToken) {
              setToken("refresh_token", refreshToken);
            }

            // Clean URL
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          } else {
            this.setIsAuthenticated(false);
          }
        }
      }
    } catch (error) {
      console.error("Redirect handling failed:", error);
      clearSession();
      this.setIsAuthenticated(false);
      this.user = null;
      throw error;
    } finally {
      this.setIsLoading(false);
    }
  }

  async login(): Promise<void> {
    try {
      const newState = generateSecureState();
      setState(newState);
      this.state = newState;

      const authUrl = await generateAuthUrl(this.authParams, newState);
      window.location.href = authUrl;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.setIsLoading(true);
    try {
      await logoutFromService(
        this.authParams.clientId,
        this.authParams.authBaseUrl
      );
    } catch (error) {
      console.error("Failed to logout from service:", error);
    }
    clearSession();
    this.setIsAuthenticated(false);
    this.setUser(null);
    this.setIsLoading(false);
    window.location.reload();
  }

  private setUser(value: BlitzWareAuthUser | null): void {
    this.user = value;
  }

  getUser(): BlitzWareAuthUser | null {
    return this.user;
  }

  private setIsAuthenticated(value: boolean): void {
    this.isAuthenticated = value;
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private setIsLoading(value: boolean): void {
    this.isLoading = value;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getAccessToken(options?: GetAccessTokenOptions): Promise<string | null> {
    return this.accessTokenManager.getAccessToken(options);
  }

  /**
   * Check if the current user has specific role(s)
   * @param role - Single role string or array of roles
   * @param requireAllRoles - If true, user must have ALL specified roles (AND logic). If false, user needs ANY role (OR logic). Default: false
   * @returns true if user has the required role(s), false otherwise
   */
  hasRole(role?: string | string[], requireAllRoles: boolean = false): boolean {
    if (!this.isAuthenticated || !this.user || !role) {
      return false;
    }

    const userRoles = this.user.roles || [];
    const requiredRoles = Array.isArray(role) ? role : [role];

    if (requiredRoles.length === 0) {
      return true;
    }

    if (requireAllRoles) {
      // AND logic: user must have ALL specified roles
      return requiredRoles.every(r => userRoles.includes(r));
    } else {
      // OR logic: user must have ANY of the specified roles
      return requiredRoles.some(r => userRoles.includes(r));
    }
  }
}
