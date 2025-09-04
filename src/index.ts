import { BlitzWareAuth } from "./BlitzWareAuth";
import { BlitzWareAuthParams } from "./types";

export async function createBlitzWareClient(authParams: BlitzWareAuthParams) {
  const blitzWareClient = new BlitzWareAuth(authParams);
  await blitzWareClient.handleRedirect();

  return {
    handleRedirect: async () => {
      return blitzWareClient.handleRedirect();
    },
    login: async () => {
      return blitzWareClient.login();
    },
    logout: async () => {
      return blitzWareClient.logout();
    },
    getUser: () => {
      return blitzWareClient.getUser();
    },
    isAuthenticated: () => {
      return blitzWareClient.getIsAuthenticated();
    },
    isLoading: () => {
      return blitzWareClient.getIsLoading();
    },
    hasRole: (role?: string | string[], requireAllRoles?: boolean) => {
      return blitzWareClient.hasRole(role, requireAllRoles);
    },
  };
}

// Export classes and utilities for advanced usage
export { BlitzWareAuth } from "./BlitzWareAuth";
export { 
  BlitzWareRouteProtection, 
  BlitzWareElementProtection, 
  protectPage, 
  createElementProtection 
} from "./RouteProtection";
export * from "./types";
