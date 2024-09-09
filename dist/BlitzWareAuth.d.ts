import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
export declare class BlitzWareAuth {
    private authParams;
    private state;
    private user;
    private isAuthenticated;
    private isLoading;
    constructor(authParams: BlitzWareAuthParams);
    handleRedirect(): Promise<void>;
    login(): void;
    logout(): void;
    private setUser;
    getUser(): BlitzWareAuthUser | null;
    private setIsAuthenticated;
    getIsAuthenticated(): boolean;
    private setIsLoading;
    getIsLoading(): boolean;
}
//# sourceMappingURL=BlitzWareAuth.d.ts.map