import { BlitzWareAuthParams } from "./types";
export declare function createBlitzWareClient(authParams: BlitzWareAuthParams): Promise<{
    handleRedirect: () => Promise<void>;
    login: () => void;
    logout: () => void;
    getUser: () => Promise<import("./types").BlitzWareAuthUser | null>;
    isAuthenticated: () => Promise<boolean>;
    isLoading: () => Promise<boolean>;
}>;
//# sourceMappingURL=index.d.ts.map