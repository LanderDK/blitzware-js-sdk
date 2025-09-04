/**
 * RouteProtection Tests
 * Testing the route protection utilities for vanilla JavaScript
 */

import { BlitzWareAuth } from '../src/BlitzWareAuth';
import { BlitzWareRouteProtection, BlitzWareElementProtection } from '../src/RouteProtection';
import { BlitzWareAuthUser } from '../src/types';

// Mock timers
jest.useFakeTimers();

// Mock setInterval and clearInterval
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;
const mockSetInterval = jest.fn().mockImplementation(originalSetInterval);
const mockClearInterval = jest.fn().mockImplementation(originalClearInterval);

Object.defineProperty(global, 'setInterval', {
  value: mockSetInterval
});
Object.defineProperty(global, 'clearInterval', {
  value: mockClearInterval
});

// Mock axios
jest.mock('axios');

// Mock the utils functions
jest.mock('../src/utils', () => ({
  generateAuthUrl: jest.fn(),
  hasAuthParams: jest.fn().mockReturnValue(false),
  isTokenValid: jest.fn().mockReturnValue(false),
  setToken: jest.fn(),
  setState: jest.fn(),
  getState: jest.fn(),
  fetchUserInfo: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  tryRefreshToken: jest.fn(),
  generateSecureState: jest.fn().mockReturnValue('test-state'),
  logoutFromService: jest.fn(),
  clearSession: jest.fn(),
}));

describe('BlitzWareRouteProtection', () => {
  let auth: BlitzWareAuth;
  let routeProtection: BlitzWareRouteProtection;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    mockClearInterval.mockClear();
    
    auth = new BlitzWareAuth({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/callback',
    });
    
    // Ensure auth is not loading by default
    auth['isLoading'] = false;
    auth['isAuthenticated'] = false;
    auth['user'] = null;
    
    routeProtection = new BlitzWareRouteProtection(auth);
  });

  describe('canAccess method', () => {
    beforeEach(() => {
      // Reset auth state
      auth['isAuthenticated'] = false;
      auth['isLoading'] = false;
      auth['user'] = null;
    });

    it('should deny access when user is not authenticated', async () => {
      const result = await routeProtection.canAccess();
      
      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe('/login');
      expect(result.reason).toBe('Not authenticated');
    });

    it('should allow access when user is authenticated and no role required', async () => {
      auth['isAuthenticated'] = true;
      auth['user'] = {
        id: '1',
        username: 'testuser',
        roles: ['user']
      };

      const result = await routeProtection.canAccess();
      
      expect(result.allowed).toBe(true);
      expect(result.redirectTo).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should allow access when user has required role', async () => {
      auth['isAuthenticated'] = true;
      auth['user'] = {
        id: '1',
        username: 'testuser',
        roles: ['admin', 'user']
      };

      // Mock hasRole to return true
      jest.spyOn(auth, 'hasRole').mockReturnValue(true);

      const result = await routeProtection.canAccess({ role: 'admin' });
      
      expect(result.allowed).toBe(true);
      expect(auth.hasRole).toHaveBeenCalledWith('admin', false);
    });

    it('should deny access when user lacks required role', async () => {
      auth['isAuthenticated'] = true;
      auth['user'] = {
        id: '1',
        username: 'testuser',
        roles: ['user']
      };

      // Mock hasRole to return false
      jest.spyOn(auth, 'hasRole').mockReturnValue(false);

      const result = await routeProtection.canAccess({ role: 'admin' });
      
      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe('/unauthorized');
      expect(result.reason).toBe('Insufficient permissions');
      expect(auth.hasRole).toHaveBeenCalledWith('admin', false);
    });

    it('should use custom redirect URLs', async () => {
      const customOptions = {
        loginUrl: '/custom-login',
        unauthorizedUrl: '/custom-unauthorized'
      };

      routeProtection = new BlitzWareRouteProtection(auth, customOptions);

      // Test unauthenticated redirect
      auth['isAuthenticated'] = false;
      let result = await routeProtection.canAccess();
      expect(result.redirectTo).toBe('/custom-login');

      // Test unauthorized redirect
      auth['isAuthenticated'] = true;
      auth['user'] = { id: '1', username: 'testuser', roles: ['user'] };
      jest.spyOn(auth, 'hasRole').mockReturnValue(false);
      
      result = await routeProtection.canAccess({ role: 'admin' });
      expect(result.redirectTo).toBe('/custom-unauthorized');
    });

    it('should handle multiple roles with AND logic', async () => {
      auth['isAuthenticated'] = true;
      auth['user'] = {
        id: '1',
        username: 'testuser',
        roles: ['admin', 'user']
      };

      // Mock hasRole to return false for AND logic (missing premium role)
      jest.spyOn(auth, 'hasRole').mockReturnValue(false);

      const result = await routeProtection.canAccess({
        role: ['admin', 'premium'],
        requireAllRoles: true
      });
      
      expect(result.allowed).toBe(false);
      expect(auth.hasRole).toHaveBeenCalledWith(['admin', 'premium'], true);
    });
  });

  describe('protectRoute method', () => {
    it('should redirect to login when not authenticated', async () => {
      auth['isAuthenticated'] = false;
      auth['isLoading'] = false;

      const result = await routeProtection.protectRoute();
      
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login');
    });

    it('should store return URL when redirecting to login', async () => {
      auth['isAuthenticated'] = false;
      auth['isLoading'] = false;
      
      // Mock current location
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/admin/dashboard',
          search: '?tab=users',
          href: '/admin/dashboard?tab=users'
        },
        writable: true
      });

      await routeProtection.protectRoute();
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'blitzware_return_url',
        '/admin/dashboard?tab=users'
      );
    });

    it('should return true when access is allowed', async () => {
      auth['isAuthenticated'] = true;
      auth['isLoading'] = false;
      auth['user'] = { id: '1', username: 'testuser', roles: ['user'] };

      const result = await routeProtection.protectRoute();
      
      expect(result).toBe(true);
    });
  });

  describe('createGuard method', () => {
    it('should return a function that checks access', async () => {
      const guard = routeProtection.createGuard({ role: 'admin' });
      
      expect(typeof guard).toBe('function');

      // Mock authenticated user with admin role
      auth['isAuthenticated'] = true;
      auth['user'] = { id: '1', username: 'testuser', roles: ['admin'] };
      jest.spyOn(auth, 'hasRole').mockReturnValue(true);

      const result = await guard();
      expect(result).toBe(true);
    });

    it('should return redirect URL when access is denied', async () => {
      const guard = routeProtection.createGuard({ role: 'admin' });
      
      // Mock unauthenticated user
      auth['isAuthenticated'] = false;

      const result = await guard();
      expect(result).toBe('/login');
    });
  });

  describe('getReturnUrl method', () => {
    it('should return stored return URL and clear it', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue('/admin/dashboard');
      
      const returnUrl = routeProtection.getReturnUrl();
      
      expect(returnUrl).toBe('/admin/dashboard');
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('blitzware_return_url');
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('blitzware_return_url');
    });

    it('should return default URL when no return URL is stored', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const returnUrl = routeProtection.getReturnUrl();
      
      expect(returnUrl).toBe('/dashboard');
    });
  });
});

describe('BlitzWareElementProtection', () => {
  let auth: BlitzWareAuth;
  let elementProtection: BlitzWareElementProtection;

  beforeEach(() => {
    auth = new BlitzWareAuth({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/callback',
    });
    
    elementProtection = new BlitzWareElementProtection(auth);

    // Mock DOM elements
    document.body.innerHTML = `
      <div data-auth="authenticated">Authenticated content</div>
      <div data-auth="unauthenticated">Unauthenticated content</div>
      <div data-auth="loading">Loading...</div>
      <div data-role="admin">Admin content</div>
      <div data-role="admin,moderator">Admin or Moderator content</div>
      <div data-role="admin,premium" data-require-all-roles="true">Admin and Premium content</div>
    `;
  });

  describe('updateAuthElements method', () => {
    it('should show authenticated elements when user is authenticated', () => {
      auth['isAuthenticated'] = true;
      auth['isLoading'] = false;

      elementProtection.updateAuthElements();

      const authElement = document.querySelector('[data-auth="authenticated"]') as HTMLElement;
      const unauthElement = document.querySelector('[data-auth="unauthenticated"]') as HTMLElement;
      const loadingElement = document.querySelector('[data-auth="loading"]') as HTMLElement;

      expect(authElement.style.display).toBe('');
      expect(unauthElement.style.display).toBe('none');
      expect(loadingElement.style.display).toBe('none');
    });

    it('should show unauthenticated elements when user is not authenticated', () => {
      auth['isAuthenticated'] = false;
      auth['isLoading'] = false;

      elementProtection.updateAuthElements();

      const authElement = document.querySelector('[data-auth="authenticated"]') as HTMLElement;
      const unauthElement = document.querySelector('[data-auth="unauthenticated"]') as HTMLElement;

      expect(authElement.style.display).toBe('none');
      expect(unauthElement.style.display).toBe('');
    });

    it('should show loading elements when auth is loading', () => {
      auth['isLoading'] = true;

      elementProtection.updateAuthElements();

      const loadingElement = document.querySelector('[data-auth="loading"]') as HTMLElement;
      expect(loadingElement.style.display).toBe('');
    });
  });

  describe('updateRoleElements method', () => {
    beforeEach(() => {
      auth['isAuthenticated'] = true;
      auth['user'] = {
        id: '1',
        username: 'testuser',
        roles: ['admin', 'user']
      };
    });

    it('should show elements when user has required role', () => {
      jest.spyOn(auth, 'hasRole').mockImplementation((roles) => {
        if (roles === 'admin') return true;
        if (Array.isArray(roles) && roles.includes('admin')) return true;
        return false;
      });

      elementProtection.updateRoleElements();

      const adminElement = document.querySelector('[data-role="admin"]') as HTMLElement;
      expect(adminElement.style.display).toBe('');
      expect(auth.hasRole).toHaveBeenCalledWith(['admin'], false);
    });

    it('should handle multiple roles with OR logic', () => {
      jest.spyOn(auth, 'hasRole').mockImplementation((roles, requireAll) => {
        if (Array.isArray(roles) && roles.includes('admin') && !requireAll) return true;
        return false;
      });

      elementProtection.updateRoleElements();

      const multiRoleElement = document.querySelector('[data-role="admin,moderator"]') as HTMLElement;
      expect(multiRoleElement.style.display).toBe('');
      expect(auth.hasRole).toHaveBeenCalledWith(['admin', 'moderator'], false);
    });

    it('should handle multiple roles with AND logic', () => {
      jest.spyOn(auth, 'hasRole').mockImplementation((roles, requireAll) => {
        if (Array.isArray(roles) && requireAll) return false; // User doesn't have premium
        return true;
      });

      elementProtection.updateRoleElements();

      const andRoleElement = document.querySelector('[data-role="admin,premium"][data-require-all-roles="true"]') as HTMLElement;
      expect(andRoleElement.style.display).toBe('none');
      expect(auth.hasRole).toHaveBeenCalledWith(['admin', 'premium'], true);
    });
  });

  describe('startAutoUpdate method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up interval for automatic updates', () => {
      const stopAutoUpdate = elementProtection.startAutoUpdate(1000);

      expect(typeof stopAutoUpdate).toBe('function');

      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(1000);

      // The interval should have been set up - check that setInterval was called
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      // Clean up
      stopAutoUpdate();
    });

    it('should detect auth state changes and update elements', () => {
      jest.spyOn(elementProtection, 'updateAllElements');
      
      // Start auto-update
      elementProtection.startAutoUpdate(100);

      // Initially authenticated
      auth['isAuthenticated'] = true;
      auth['isLoading'] = false;
      auth['user'] = { id: '1', username: 'testuser', roles: ['user'] };

      // Advance time to trigger first check
      jest.advanceTimersByTime(100);

      // Change auth state
      auth['isAuthenticated'] = false;

      // Advance time to trigger state change detection
      jest.advanceTimersByTime(100);

      expect(elementProtection.updateAllElements).toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  jest.useRealTimers();
});
