import { BlitzWareAuth } from "./BlitzWareAuth";
import { BlitzWareAuthParams } from "./types";

export async function createBlitzWareClient(authParams: BlitzWareAuthParams) {
  const blitzWareClient = new BlitzWareAuth(authParams);
  await blitzWareClient.handleRedirect();

  return {
    handleRedirect: async () => {
      return blitzWareClient.handleRedirect();
    },
    login: () => {
      blitzWareClient.login();
    },
    logout: () => {
      blitzWareClient.logout();
    },
    getUser: async () => {
      return blitzWareClient.getUser();
    },
    isAuthenticated: async () => {
      return blitzWareClient.getIsAuthenticated();
    },
    isLoading: async () => {
      return blitzWareClient.getIsLoading();
    },
  };
}
