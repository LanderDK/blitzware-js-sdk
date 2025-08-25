import { BlitzWareAuthParams } from "./types";
export declare function createBlitzWareClient(authParams: BlitzWareAuthParams): Promise<{
    handleRedirect: () => Promise<void>;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getUser: () => import("./types").BlitzWareAuthUser | null;
    isAuthenticated: () => boolean;
    isLoading: () => boolean;
}>;
//# sourceMappingURL=index.d.ts.map