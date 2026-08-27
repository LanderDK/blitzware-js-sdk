import { BlitzWareAuthParams, GetAccessTokenOptions } from "./types";
import { clearSession, getToken, isTokenValid, tryRefreshToken } from "./utils";
interface AccessTokenManagerCallbacks {
    onSessionExpired: () => void;
    onSessionRefreshed: () => void;
}
interface AccessTokenManagerDependencies {
    clearSession: typeof clearSession;
    getToken: typeof getToken;
    isTokenValid: typeof isTokenValid;
    tryRefreshToken: typeof tryRefreshToken;
}
export declare const createAccessTokenManager: (authParams: BlitzWareAuthParams, callbacks: AccessTokenManagerCallbacks, dependencies?: AccessTokenManagerDependencies) => {
    getAccessToken: (options?: GetAccessTokenOptions) => Promise<string | null>;
    start: () => void;
    dispose: () => void;
};
export {};
//# sourceMappingURL=tokenManager.d.ts.map