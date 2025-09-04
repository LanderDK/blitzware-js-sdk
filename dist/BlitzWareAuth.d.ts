import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
export declare class BlitzWareAuth {
    private authParams;
    private state;
    private user;
    private isAuthenticated;
    private isLoading;
    private didInitialize;
    constructor(authParams: BlitzWareAuthParams);
    private initializeAuth;
    handleRedirect(): Promise<void>;
    login(): Promise<void>;
    logout(): Promise<void>;
    private setUser;
    getUser(): BlitzWareAuthUser | null;
    private setIsAuthenticated;
    getIsAuthenticated(): boolean;
    private setIsLoading;
    getIsLoading(): boolean;
    /**
     * Check if the current user has specific role(s)
     * @param role - Single role string or array of roles
     * @param requireAllRoles - If true, user must have ALL specified roles (AND logic). If false, user needs ANY role (OR logic). Default: false
     * @returns true if user has the required role(s), false otherwise
     */
    hasRole(role?: string | string[], requireAllRoles?: boolean): boolean;
}
//# sourceMappingURL=BlitzWareAuth.d.ts.map