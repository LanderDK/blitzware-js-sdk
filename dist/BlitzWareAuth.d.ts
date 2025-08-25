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
}
//# sourceMappingURL=BlitzWareAuth.d.ts.map