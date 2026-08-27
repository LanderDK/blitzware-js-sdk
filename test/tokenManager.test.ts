import { createAccessTokenManager } from "../src/tokenManager";
import { BlitzWareAuthError } from "../src/types";
import {
  clearSession,
  getToken,
  isTokenValid,
  tryRefreshToken,
} from "../src/utils";

jest.mock("../src/utils", () => ({
  clearSession: jest.fn(),
  getToken: jest.fn(),
  isTokenValid: jest.fn(),
  tryRefreshToken: jest.fn(),
}));

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockedIsTokenValid = isTokenValid as jest.MockedFunction<typeof isTokenValid>;
const mockedTryRefreshToken = tryRefreshToken as jest.MockedFunction<typeof tryRefreshToken>;
const mockedClearSession = clearSession as jest.MockedFunction<typeof clearSession>;

describe("access token manager", () => {
  const onSessionExpired = jest.fn();
  const onSessionRefreshed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis.navigator, "locks", {
      configurable: true,
      value: {
        request: jest.fn(async (_name: string, callback: () => Promise<unknown>) =>
          callback()),
      },
    });
  });

  const manager = () => createAccessTokenManager(
    { clientId: "client", redirectUri: "https://app.test/callback" },
    { onSessionExpired, onSessionRefreshed },
  );

  it("returns a token that is valid beyond the default safety window", async () => {
    mockedGetToken.mockImplementation((type) =>
      type === "access_token" ? "valid-token" : "refresh-token");
    mockedIsTokenValid.mockReturnValue(true);

    await expect(manager().getAccessToken()).resolves.toBe("valid-token");
    expect(mockedIsTokenValid).toHaveBeenCalledWith(60);
    expect(mockedTryRefreshToken).not.toHaveBeenCalled();
  });

  it("reuses a token another request replaced after a rejected token", async () => {
    mockedGetToken.mockImplementation((type) =>
      type === "access_token" ? "new-token" : "refresh-token");
    mockedIsTokenValid.mockReturnValue(true);

    await expect(manager().getAccessToken({
      forceRefresh: true,
      rejectedToken: "old-token",
    })).resolves.toBe("new-token");
    expect(mockedTryRefreshToken).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refreshes", async () => {
    mockedGetToken.mockImplementation((type) =>
      type === "refresh_token" ? "refresh-token" : "expired-token");
    mockedIsTokenValid.mockReturnValue(false);
    let resolveRefresh!: (value: {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
    }) => void;
    mockedTryRefreshToken.mockReturnValue(new Promise((resolve) => {
      resolveRefresh = resolve;
    }));

    const tokenManager = manager();
    const first = tokenManager.getAccessToken();
    const second = tokenManager.getAccessToken();
    resolveRefresh({ access_token: "renewed-token" });

    await expect(Promise.all([first, second])).resolves.toEqual([
      "renewed-token",
      "renewed-token",
    ]);
    expect(mockedTryRefreshToken).toHaveBeenCalledTimes(1);
    expect(onSessionRefreshed).toHaveBeenCalledTimes(1);
  });

  it("rechecks tokens after taking the cross-tab lock", async () => {
    mockedGetToken.mockReturnValueOnce("old-token").mockReturnValueOnce("new-token");
    mockedIsTokenValid.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await expect(manager().getAccessToken()).resolves.toBe("new-token");
    expect(navigator.locks.request).toHaveBeenCalledTimes(1);
    expect(mockedTryRefreshToken).not.toHaveBeenCalled();
  });

  it("synchronizes logout and refreshed sessions from other tabs", () => {
    const tokenManager = manager();
    tokenManager.start();
    const dispatchStorage = (key: string) => {
      const event = new StorageEvent("storage", { key });
      Object.defineProperty(event, "storageArea", { value: localStorage });
      window.dispatchEvent(event);
    };

    mockedGetToken.mockReturnValue(null);
    dispatchStorage("refresh_token");
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

    mockedGetToken.mockImplementation((type) =>
      type === "access_token" ? "new-token" : "refresh-token");
    mockedIsTokenValid.mockReturnValue(true);
    dispatchStorage("access_token");
    expect(onSessionRefreshed).toHaveBeenCalledTimes(1);
    tokenManager.dispose();
  });

  it("does not schedule a background refresh timer", () => {
    jest.useFakeTimers();
    const tokenManager = manager();
    tokenManager.start();
    expect(jest.getTimerCount()).toBe(0);
    tokenManager.dispose();
    jest.useRealTimers();
  });

  it("clears a terminally invalid session", async () => {
    mockedGetToken.mockImplementation((type) =>
      type === "refresh_token" ? "refresh-token" : "expired-token");
    mockedIsTokenValid.mockReturnValue(false);
    mockedTryRefreshToken.mockRejectedValue(new BlitzWareAuthError(
      "Refresh rejected",
      "refresh_failed",
      { error: "invalid_grant" },
    ));

    await expect(manager().getAccessToken()).resolves.toBeNull();
    expect(mockedClearSession).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("preserves the session when refresh fails transiently", async () => {
    mockedGetToken.mockImplementation((type) =>
      type === "refresh_token" ? "refresh-token" : "expired-token");
    mockedIsTokenValid.mockReturnValue(false);
    const error = new BlitzWareAuthError("Unavailable", "refresh_failed");
    mockedTryRefreshToken.mockRejectedValue(error);

    await expect(manager().getAccessToken()).rejects.toBe(error);
    expect(mockedClearSession).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
