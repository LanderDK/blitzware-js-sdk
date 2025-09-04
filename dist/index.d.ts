import { BlitzWareAuthParams } from "./types";
export declare function createBlitzWareClient(authParams: BlitzWareAuthParams): Promise<{
    handleRedirect: () => Promise<void>;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getUser: () => import("./types").BlitzWareAuthUser | null;
    isAuthenticated: () => boolean;
    isLoading: () => boolean;
    hasRole: (role?: string | string[], requireAllRoles?: boolean) => boolean;
}>;
export { BlitzWareAuth } from "./BlitzWareAuth";
export { BlitzWareRouteProtection, BlitzWareElementProtection, protectPage, createElementProtection } from "./RouteProtection";
export * from "./types";
//# sourceMappingURL=index.d.ts.map