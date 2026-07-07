import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
declare const normalizeAuthBaseUrl: (authBaseUrl?: string) => string;
/**
 * Clears the current session by removing all stored tokens and state.
 */
declare const clearSession: () => void;
/**
 * Checks if the URL search parameters contain authentication parameters.
 * @param searchParams - The URL search string to check (defaults to window.location.search).
 * @returns True if authentication parameters are present, false otherwise.
 */
declare const hasAuthParams: (searchParams?: string) => boolean;
/**
 * Generates the BlitzWare authorization URL with optional PKCE support.
 * @param params - The authorization parameters.
 * @param state - The state string to include in the request.
 * @returns The full authorization URL.
 */
declare const generateAuthUrl: ({ responseType, clientId, redirectUri, authBaseUrl, }: BlitzWareAuthParams, state: string) => Promise<string>;
/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param code - The authorization code received from the authorization server.
 * @param clientId - The client ID.
 * @param redirectUri - The redirect URI.
 * @returns An object containing the access token and optionally a refresh token.
 * @throws BlitzWareAuthError if the code_verifier is missing or the exchange fails.
 */
declare const exchangeCodeForToken: (code: string, clientId: string, redirectUri: string, authBaseUrl?: string) => Promise<{
    access_token: string;
    refresh_token?: string;
}>;
/**
 * Fetches user information using the stored access token with validation.
 * Validates the token with the authorization server before fetching user info.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns The authenticated user's information.
 * @throws BlitzWareAuthError if the token is invalid or request fails.
 */
declare const fetchUserInfo: (clientId: string, clientSecret?: string, authBaseUrl?: string) => Promise<BlitzWareAuthUser>;
/**
 * Attempts to refresh the access token using the stored refresh token with validation.
 * Validates the refresh token before attempting to use it.
 * @param clientId - The client ID.
 * @param clientSecret - The client secret (optional for public clients).
 * @returns An object containing the new access token and optionally a new refresh token.
 * @throws BlitzWareAuthError if refresh token is invalid or refresh fails.
 */
declare const tryRefreshToken: (clientId: string, clientSecret?: string, authBaseUrl?: string) => Promise<{
    access_token: string;
    refresh_token?: string;
}>;
/**
 * Stores an access or refresh token in localStorage.
 * @param type - The type of token ("access_token" or "refresh_token").
 * @param token - The token value.
 */
declare const setToken: (type: "access_token" | "refresh_token", token: string) => void;
/**
 * Checks if the stored access token is valid (not expired).
 * This is a quick local check based on JWT expiration.
 * @returns True if the token appears valid locally, false otherwise.
 */
declare const isTokenValid: () => boolean;
/**
 * Stores the OAuth state value in localStorage.
 * @param state - The state string.
 */
declare const setState: (state: string) => void;
/**
 * Retrieves the OAuth state value from localStorage.
 * @returns The state string or null if not found.
 */
declare const getState: () => string | null;
/**
 * Generates a cryptographically secure random state string.
 * @returns A base64url-encoded random string.
 */
declare const generateSecureState: () => string;
/**
 * Logs out the user from the BlitzWare authentication service.
 * @param clientId - The client ID.
 * @param options - Optional logout configuration.
 * @returns Promise that resolves when logout is complete.
 * @throws BlitzWareAuthError if logout fails.
 */
declare const logoutFromService: (clientId: string, authBaseUrl?: string) => Promise<void>;
export { clearSession, hasAuthParams, normalizeAuthBaseUrl, generateAuthUrl, exchangeCodeForToken, fetchUserInfo, tryRefreshToken, setToken, isTokenValid, setState, getState, generateSecureState, logoutFromService, };
//# sourceMappingURL=utils.d.ts.map