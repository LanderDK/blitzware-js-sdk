import {
  BlitzWareAuthParams,
  BlitzWareAuthUser,
  BlitzWareAuthError,
  TokenIntrospectionResponse,
} from "./types";
import { Buffer } from "buffer";
import axios from "axios";

const TOKEN_RE = /[?&]access_token=[^&]+/;
const CODE_RE = /[?&]code=[^&]+/;
const STATE_RE = /[?&]state=[^&]+/;
const DEFAULT_AUTH_BASE_URL = "https://auth.blitzware.xyz/api/auth/";

const normalizeAuthBaseUrl = (authBaseUrl?: string): string => {
  const value = authBaseUrl || DEFAULT_AUTH_BASE_URL;

  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/+$/, "") + "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    throw new BlitzWareAuthError("Invalid authBaseUrl", "invalid_auth_base_url");
  }
};

const buildAuthUrl = (authBaseUrl: string | undefined, path: string): string =>
  `${normalizeAuthBaseUrl(authBaseUrl)}${path.replace(/^\/+/, "")}`;

const createApiClient = (authBaseUrl?: string) =>
  axios.create({
    baseURL: normalizeAuthBaseUrl(authBaseUrl),
    withCredentials: true, // Include session cookies in all requests
    headers: {
      "Content-Type": "application/json",
    },
  });

/**
 * Parses an API error response and creates a BlitzWareAuthError.
 * @param error - The axios error or generic error.
 * @param fallbackMessage - Fallback message if parsing fails.
 * @param fallbackCode - Fallback code if parsing fails.
 * @returns A BlitzWareAuthError with parsed details.
 */
const parseApiError = (
  error: any,
  fallbackMessage: string,
  fallbackCode: string
): BlitzWareAuthError => {
  // Check if it's an axios error with response data
  if (error?.response?.data) {
    const responseData = error.response.data;

    // OAuth token endpoints use the RFC 6749 error shape rather than the
    // provider's general { code, message, details } API error shape.
    if (typeof responseData.error === "string") {
      return new BlitzWareAuthError(
        responseData.error_description || fallbackMessage,
        responseData.error,
        responseData
      );
    }

    // Check if response matches our API error format
    if (responseData.code && responseData.message) {
      return new BlitzWareAuthError(
        responseData.message,
        responseData.code,
        responseData.details
      );
    }
  }

  // Fallback to generic error
  return new BlitzWareAuthError(fallbackMessage, fallbackCode);
};

/**
 * Clears the current session by removing all stored tokens and state.
 */
const clearSession = (): void => {
  removeToken("access_token");
  removeToken("refresh_token");
  removeToken("id_token");
  removeState();
  removeCodeVerifier();
};

/**
 * Checks if the URL search parameters contain authentication parameters.
 * @param searchParams - The URL search string to check (defaults to window.location.search).
 * @returns True if authentication parameters are present, false otherwise.
 */
const hasAuthParams = (searchParams = window.location.search): boolean =>
  (TOKEN_RE.test(searchParams) || CODE_RE.test(searchParams)) &&
  STATE_RE.test(searchParams);

/**
 * Generates the BlitzWare authorization URL with optional PKCE support.
 * @param params - The authorization parameters.
 * @param state - The state string to include in the request.
 * @returns The full authorization URL.
 */
const generateAuthUrl = async (
  {
    responseType = "code",
    clientId,
    redirectUri,
    authBaseUrl,
  }: BlitzWareAuthParams,
  state: string
): Promise<string> => {
  const authUrl = buildAuthUrl(authBaseUrl, "authorize");
  const queryParams = new URLSearchParams({
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  if (responseType === "code") {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    setCodeVerifier(verifier);
    queryParams.append("code_challenge", challenge);
    queryParams.append("code_challenge_method", "S256");
  }

  return `${authUrl}?${queryParams.toString()}`;
};

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param code - The authorization code received from the authorization server.
 * @param clientId - The client ID.
 * @param redirectUri - The redirect URI.
 * @returns An object containing the access token and optionally a refresh token.
 * @throws BlitzWareAuthError if the code_verifier is missing or the exchange fails.
 */
const exchangeCodeForToken = async (
  code: string,
  clientId: string,
  redirectUri: string,
  authBaseUrl?: string
): Promise<{ access_token: string; refresh_token?: string; id_token?: string }> => {
  const codeVerifier = getCodeVerifier();
  if (!codeVerifier)
    throw new BlitzWareAuthError(
      "Missing PKCE code_verifier",
      "missing_code_verifier"
    );

  try {
    const apiClient = createApiClient(authBaseUrl);
    const response = await apiClient.post("token", {
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    removeCodeVerifier();
    return response.data;
  } catch (error) {
    throw parseApiError(
      error,
      "Failed to exchange code for token",
      "exchange_failed"
    );
  }
};

/**
 * Fetches user information using the stored access token with validation.
 * Validates the token with the authorization server before fetching user info.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns The authenticated user's information.
 * @throws BlitzWareAuthError if the token is invalid or request fails.
 */
const fetchUserInfo = async (
  clientId: string,
  clientSecret?: string,
  authBaseUrl?: string
): Promise<BlitzWareAuthUser> => {
  // First validate the token using introspection
  const tokenValidation = await validateAccessToken(
    clientId,
    clientSecret,
    authBaseUrl
  );

  if (!tokenValidation.active) {
    throw new BlitzWareAuthError(
      "Access token is not active or has expired",
      "token_inactive"
    );
  }

  // If token is valid, fetch user info
  const accessToken = getToken("access_token");
  if (!accessToken) {
    throw new BlitzWareAuthError(
      "No access token available",
      "no_access_token"
    );
  }

  try {
    const apiClient = createApiClient(authBaseUrl);
    const response = await apiClient.get("userinfo", {
      params: {
        access_token: accessToken,
      },
    });
    return response.data;
  } catch (error) {
    throw parseApiError(error, "Failed to fetch user info", "userinfo_failed");
  }
};

/**
 * Attempts to refresh the access token using the stored refresh token.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns An object containing the new access token and optionally a new refresh token.
 * @throws BlitzWareAuthError if refresh token is invalid or refresh fails.
 */
const tryRefreshToken = async (
  clientId: string,
  clientSecret?: string,
  authBaseUrl?: string
): Promise<{ access_token: string; refresh_token?: string; id_token?: string }> => {
  const refreshToken = getToken("refresh_token");
  if (!refreshToken)
    throw new BlitzWareAuthError(
      "No refresh token available",
      "no_refresh_token"
    );

  try {
    const apiClient = createApiClient(authBaseUrl);
    const response = await apiClient.post("token", {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    });

    setToken("access_token", response.data.access_token);
    if (response.data.refresh_token) {
      setToken("refresh_token", response.data.refresh_token);
    }
    if (response.data.id_token) {
      setToken("id_token", response.data.id_token);
    }

    return response.data;
  } catch (error) {
    throw parseApiError(error, "Failed to refresh token", "refresh_failed");
  }
};

/**
 * Stores an access or refresh token in localStorage.
 * @param type - The type of token ("access_token" or "refresh_token").
 * @param token - The token value.
 */
const setToken = (
  type: "access_token" | "refresh_token" | "id_token",
  token: string
) => {
  localStorage.setItem(type, token);
};

/**
 * Retrieves an access or refresh token from localStorage.
 * @param type - The type of token ("access_token" or "refresh_token").
 * @returns The token value or null if not found.
 */
const getToken = (
  type: "access_token" | "refresh_token" | "id_token"
): string | null => {
  return localStorage.getItem(type);
};

/**
 * Removes an access or refresh token from localStorage.
 * @param type - The type of token ("access_token" or "refresh_token").
 */
const removeToken = (type: "access_token" | "refresh_token" | "id_token") => {
  localStorage.removeItem(type);
};

/**
 * Decodes a JWT and returns its payload as an object.
 * @param token - The JWT string.
 * @returns The decoded payload object, or {} if decoding fails.
 */
const parseJwt = (token: string) => {
  try {
    if (!token) return {};
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    
    const base64Url = parts[1];
    // Replace URL-safe characters and add padding if needed
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    
    let jsonPayload: string;
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      const payload = Buffer.from(padded, "base64");
      jsonPayload = payload.toString("utf8");
    } else {
      // Browser environment
      jsonPayload = atob(padded);
    }
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error(error);
    return {};
  }
};

/**
 * Converts a JWT exp (expiration) value to a Date object.
 * @param exp - The expiration value (number or string).
 * @returns The expiration as a Date, or null if invalid.
 */
const parseExp = (exp: number | string) => {
  if (!exp) return null;
  if (typeof exp !== "number") exp = Number(exp);
  if (isNaN(exp)) return null;
  return new Date(exp * 1000);
};

/**
 * Checks if the stored access token is valid (not expired).
 * This is a quick local check based on JWT expiration.
 * @returns True if the token appears valid locally, false otherwise.
 */
const isTokenValid = (minValiditySeconds = 0): boolean => {
  const token = getToken("access_token");
  if (!token) return false;

  const payload = parseJwt(token);
  if (!payload || typeof payload !== 'object') return false;
  
  const { exp } = payload;
  const expiration = parseExp(exp);
  if (!expiration) return false;
  return expiration.getTime() > Date.now() + Math.max(0, minValiditySeconds) * 1000;
};

/**
 * Validates an access token by introspecting it with the authorization server.
 * This provides authoritative validation from the server.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns Promise that resolves to introspection result.
 * @throws BlitzWareAuthError if validation fails.
 */
const validateAccessToken = async (
  clientId: string,
  clientSecret?: string,
  authBaseUrl?: string
): Promise<TokenIntrospectionResponse> => {
  const token = getToken("access_token");
  if (!token) {
    return { active: false };
  }

  try {
    return await introspectToken(
      token,
      "access_token",
      clientId,
      clientSecret,
      authBaseUrl
    );
  } catch (error) {
    // If introspection fails, token is considered invalid
    return { active: false };
  }
};

/**
 * Validates a refresh token by introspecting it with the authorization server.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns Promise that resolves to introspection result.
 * @throws BlitzWareAuthError if validation fails.
 */
const validateRefreshToken = async (
  clientId: string,
  clientSecret?: string,
  authBaseUrl?: string
): Promise<TokenIntrospectionResponse> => {
  const token = getToken("refresh_token");
  if (!token) {
    return { active: false };
  }

  try {
    return await introspectToken(
      token,
      "refresh_token",
      clientId,
      clientSecret,
      authBaseUrl
    );
  } catch (error) {
    // If introspection fails, token is considered invalid
    return { active: false };
  }
};

/**
 * Stores the OAuth state value in localStorage.
 * @param state - The state string.
 */
const setState = (state: string) => {
  localStorage.setItem("state", state);
};

/**
 * Retrieves the OAuth state value from localStorage.
 * @returns The state string or null if not found.
 */
const getState = () => {
  return localStorage.getItem("state");
};

/**
 * Removes the OAuth state value from localStorage.
 */
const removeState = () => {
  localStorage.removeItem("state");
};

/**
 * Generates a high-entropy PKCE code_verifier.
 * @returns The code_verifier string.
 */
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Generates a PKCE code_challenge from a code_verifier.
 * @param verifier - The code_verifier string.
 * @returns The code_challenge string.
 */
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const hash = new Uint8Array(digest);
  return btoa(String.fromCharCode.apply(null, Array.from(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Stores the PKCE code_verifier in localStorage.
 * @param verifier - The code_verifier string.
 */
const setCodeVerifier = (verifier: string) => {
  localStorage.setItem("pkce_code_verifier", verifier);
};

/**
 * Retrieves the PKCE code_verifier from localStorage.
 * @returns The code_verifier string or null if not found.
 */
const getCodeVerifier = (): string | null => {
  return localStorage.getItem("pkce_code_verifier");
};

/**
 * Removes the PKCE code_verifier from localStorage.
 */
const removeCodeVerifier = () => {
  localStorage.removeItem("pkce_code_verifier");
};

/**
 * Generates a cryptographically secure random state string.
 * @returns A base64url-encoded random string.
 */
const generateSecureState = (): string => {
  const array = new Uint8Array(32); // 256 bits of entropy
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Logs out the user from the BlitzWare authentication service.
 * @param clientId - The client ID.
 * @param options - Optional logout configuration.
 * @returns Promise that resolves when logout is complete.
 * @throws BlitzWareAuthError if logout fails.
 */
const logoutFromService = async (
  clientId: string,
  authBaseUrl?: string
): Promise<void> => {
  try {
    const apiClient = createApiClient(authBaseUrl);
    await apiClient.post("logout", { client_id: clientId });
  } catch (error) {
    throw parseApiError(error, "Failed to log out", "logout_failed");
  }
};

/**
 * Introspects a token to check its validity and get metadata.
 * Implements RFC 7662 OAuth2 Token Introspection.
 * @param token - The token to introspect.
 * @param tokenTypeHint - The type of token being introspected.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns Token introspection response.
 * @throws BlitzWareAuthError if introspection fails.
 */
const introspectToken = async (
  token: string,
  tokenTypeHint: "access_token" | "refresh_token",
  clientId: string,
  clientSecret?: string,
  authBaseUrl?: string
): Promise<TokenIntrospectionResponse> => {
  try {
    const requestBody: {
      token: string;
      token_type_hint: string;
      client_id: string;
      client_secret?: string;
    } = {
      token,
      token_type_hint: tokenTypeHint,
      client_id: clientId,
    };

    // Add client secret if provided (for confidential clients)
    if (clientSecret) {
      requestBody.client_secret = clientSecret;
    }

    const apiClient = createApiClient(authBaseUrl);
    const response = await apiClient.post("introspect", requestBody);

    return response.data;
  } catch (error) {
    throw parseApiError(
      error,
      "Failed to introspect token",
      "introspect_failed"
    );
  }
};

// NOT USED YET
/**
 * Revokes a specific token.
 * @param token - The token to revoke.
 * @param tokenTypeHint - The type of token being revoked.
 * @param clientId - The client ID.
 * @throws BlitzWareAuthError if revocation fails.
 */
const revokeToken = async (
  token: string,
  tokenTypeHint: "access_token" | "refresh_token",
  clientId: string,
  authBaseUrl?: string
): Promise<void> => {
  try {
    const apiClient = createApiClient(authBaseUrl);
    await apiClient.post("revoke", {
      token,
      token_type_hint: tokenTypeHint,
      client_id: clientId,
    });
  } catch (error) {
    throw parseApiError(error, "Failed to revoke token", "revoke_failed");
  }
};

export {
  clearSession,
  hasAuthParams,
  normalizeAuthBaseUrl,
  generateAuthUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  tryRefreshToken,
  setToken,
  getToken,
  isTokenValid,
  setState,
  getState,
  generateSecureState,
  logoutFromService,
};
