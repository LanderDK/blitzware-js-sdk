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
export class BlitzWareRouteProtection {
  private auth: BlitzWareAuth;
  private defaultOptions: Required<RouteProtectionOptions>;

  constructor(auth: BlitzWareAuth, options: RouteProtectionOptions = {}) {
    this.auth = auth;
    this.defaultOptions = {
      loginUrl: '/login',
      unauthorizedUrl: '/unauthorized',
      role: [],
      requireAllRoles: false,
      ...options
    };
  }

  /**
   * Check if user can access a route with specific requirements
   */
  async canAccess(options: RouteProtectionOptions = {}): Promise<{
    allowed: boolean;
    redirectTo?: string;
    reason?: string;
  }> {
    const opts = { ...this.defaultOptions, ...options };

    // Wait for auth to initialize if still loading
    while (this.auth.getIsLoading()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Check authentication
    if (!this.auth.getIsAuthenticated()) {
      return {
        allowed: false,
        redirectTo: opts.loginUrl,
        reason: 'Not authenticated'
      };
    }

    // Check role requirements
    if (opts.role && (Array.isArray(opts.role) ? opts.role.length > 0 : opts.role)) {
      if (!this.auth.hasRole(opts.role, opts.requireAllRoles)) {
        return {
          allowed: false,
          redirectTo: opts.unauthorizedUrl,
          reason: 'Insufficient permissions'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Protect a route by checking access and redirecting if necessary
   */
  async protectRoute(options: RouteProtectionOptions = {}): Promise<boolean> {
    const result = await this.canAccess(options);
    
    if (!result.allowed && result.redirectTo) {
      // Store current URL for redirect after login
      if (result.reason === 'Not authenticated') {
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('blitzware_return_url', currentUrl);
      }
      
      window.location.href = result.redirectTo;
      return false;
    }

    return result.allowed;
  }

  /**
   * Create a navigation guard function that can be used with SPA routers
   */
  createGuard(options: RouteProtectionOptions = {}) {
    return async () => {
      const result = await this.canAccess(options);
      
      if (!result.allowed) {
        if (result.redirectTo) {
          // Store current URL for redirect after login
          if (result.reason === 'Not authenticated') {
            const currentUrl = window.location.pathname + window.location.search;
            sessionStorage.setItem('blitzware_return_url', currentUrl);
          }
          return result.redirectTo;
        }
        return false;
      }
      
      return true;
    };
  }

  /**
   * Protect the current page on load
   */
  async protectCurrentPage(options: RouteProtectionOptions = {}): Promise<void> {
    await this.protectRoute(options);
  }

  /**
   * Get redirect URL after successful login
   */
  getReturnUrl(): string {
    const returnUrl = sessionStorage.getItem('blitzware_return_url');
    sessionStorage.removeItem('blitzware_return_url');
    return returnUrl || '/dashboard';
  }
}

/**
 * Simple role-based element visibility helper
 */
export class BlitzWareElementProtection {
  private auth: BlitzWareAuth;

  constructor(auth: BlitzWareAuth) {
    this.auth = auth;
  }

  /**
   * Show/hide elements based on authentication status
   */
  updateAuthElements(): void {
    // Show authenticated-only elements
    document.querySelectorAll('[data-auth="authenticated"]').forEach(el => {
      (el as HTMLElement).style.display = this.auth.getIsAuthenticated() ? '' : 'none';
    });

    // Show unauthenticated-only elements
    document.querySelectorAll('[data-auth="unauthenticated"]').forEach(el => {
      (el as HTMLElement).style.display = this.auth.getIsAuthenticated() ? 'none' : '';
    });

    // Show loading elements
    document.querySelectorAll('[data-auth="loading"]').forEach(el => {
      (el as HTMLElement).style.display = this.auth.getIsLoading() ? '' : 'none';
    });
  }

  /**
   * Show/hide elements based on role requirements
   */
  updateRoleElements(): void {
    document.querySelectorAll('[data-role]').forEach(el => {
      const element = el as HTMLElement;
      const roleAttr = element.getAttribute('data-role');
      const requireAllAttr = element.getAttribute('data-require-all-roles');
      
      if (roleAttr) {
        const roles = roleAttr.split(',').map(r => r.trim());
        const requireAll = requireAllAttr === 'true';
        const hasAccess = this.auth.hasRole(roles, requireAll);
        
        element.style.display = hasAccess ? '' : 'none';
      }
    });
  }

  /**
   * Update both auth and role-based elements
   */
  updateAllElements(): void {
    this.updateAuthElements();
    this.updateRoleElements();
  }

  /**
   * Start automatic element updates when auth state changes
   */
  startAutoUpdate(interval: number = 1000): () => void {
    let lastAuthState = this.auth.getIsAuthenticated();
    let lastLoadingState = this.auth.getIsLoading();
    let lastUser = this.auth.getUser();

    const updateLoop = () => {
      const currentAuthState = this.auth.getIsAuthenticated();
      const currentLoadingState = this.auth.getIsLoading();
      const currentUser = this.auth.getUser();

      // Check if state changed
      if (
        currentAuthState !== lastAuthState ||
        currentLoadingState !== lastLoadingState ||
        currentUser !== lastUser
      ) {
        this.updateAllElements();
        lastAuthState = currentAuthState;
        lastLoadingState = currentLoadingState;
        lastUser = currentUser;
      }
    };

    const intervalId = setInterval(updateLoop, interval);
    
    // Initial update
    this.updateAllElements();

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

/**
 * Utility function to create route protection for the current page
 */
export async function protectPage(
  auth: BlitzWareAuth, 
  options: RouteProtectionOptions = {}
): Promise<boolean> {
  const protection = new BlitzWareRouteProtection(auth, options);
  return await protection.protectRoute(options);
}

/**
 * Utility function to create element protection
 */
export function createElementProtection(auth: BlitzWareAuth): BlitzWareElementProtection {
  return new BlitzWareElementProtection(auth);
}
