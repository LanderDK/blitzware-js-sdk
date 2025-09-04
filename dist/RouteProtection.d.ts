import { BlitzWareAuth } from './BlitzWareAuth';
export interface RouteProtectionOptions {
    loginUrl?: string;
    unauthorizedUrl?: string;
    role?: string | string[];
    requireAllRoles?: boolean;
}
/**
 * Base route protection helper for vanilla JavaScript applications
 */
export declare class BlitzWareRouteProtection {
    private auth;
    private defaultOptions;
    constructor(auth: BlitzWareAuth, options?: RouteProtectionOptions);
    /**
     * Check if user can access a route with specific requirements
     */
    canAccess(options?: RouteProtectionOptions): Promise<{
        allowed: boolean;
        redirectTo?: string;
        reason?: string;
    }>;
    /**
     * Protect a route by checking access and redirecting if necessary
     */
    protectRoute(options?: RouteProtectionOptions): Promise<boolean>;
    /**
     * Create a navigation guard function that can be used with SPA routers
     */
    createGuard(options?: RouteProtectionOptions): () => Promise<string | boolean>;
    /**
     * Protect the current page on load
     */
    protectCurrentPage(options?: RouteProtectionOptions): Promise<void>;
    /**
     * Get redirect URL after successful login
     */
    getReturnUrl(): string;
}
/**
 * Simple role-based element visibility helper
 */
export declare class BlitzWareElementProtection {
    private auth;
    constructor(auth: BlitzWareAuth);
    /**
     * Show/hide elements based on authentication status
     */
    updateAuthElements(): void;
    /**
     * Show/hide elements based on role requirements
     */
    updateRoleElements(): void;
    /**
     * Update both auth and role-based elements
     */
    updateAllElements(): void;
    /**
     * Start automatic element updates when auth state changes
     */
    startAutoUpdate(interval?: number): () => void;
}
/**
 * Utility function to create route protection for the current page
 */
export declare function protectPage(auth: BlitzWareAuth, options?: RouteProtectionOptions): Promise<boolean>;
/**
 * Utility function to create element protection
 */
export declare function createElementProtection(auth: BlitzWareAuth): BlitzWareElementProtection;
//# sourceMappingURL=RouteProtection.d.ts.map