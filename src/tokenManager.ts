import {
  BlitzWareAuthError,
  BlitzWareAuthParams,
  GetAccessTokenOptions,
} from "./types";
import {
  clearSession,
  getToken,
  isTokenValid,
  tryRefreshToken,
} from "./utils";

const DEFAULT_MIN_VALIDITY_SECONDS = 60;
const LEASE_DURATION_MS = 30_000;
const LEASE_RETRY_MS = 50;
const inFlightRefreshes = new Map<string, Promise<string | null>>();

interface AccessTokenManagerCallbacks {
  onSessionExpired: () => void;
  onSessionRefreshed: () => void;
}

interface AccessTokenManagerDependencies {
  clearSession: typeof clearSession;
  getToken: typeof getToken;
  isTokenValid: typeof isTokenValid;
  tryRefreshToken: typeof tryRefreshToken;
}

const defaultDependencies: AccessTokenManagerDependencies = {
  clearSession,
  getToken,
  isTokenValid,
  tryRefreshToken,
};

interface BrowserLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));

const isTerminalRefreshError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const authError = error as Pick<BlitzWareAuthError, "code" | "details">;
  const oauthError =
    typeof authError.details?.["error"] === "string"
      ? authError.details["error"]
      : authError.code;
  return [
    "invalid_grant",
    "invalid_token",
    "no_refresh_token",
    "refresh_token_inactive",
  ].includes(oauthError);
};

const withStorageLease = async <T>(
  lockName: string,
  callback: () => Promise<T>,
): Promise<T> => {
  const leaseKey = `blitzware_refresh_lock:${lockName}`;
  const owner = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  while (true) {
    const now = Date.now();
    let current: { owner?: string; expiresAt?: number } | null = null;
    try {
      current = JSON.parse(localStorage.getItem(leaseKey) ?? "null");
    } catch {
      current = null;
    }

    if (!current?.owner || Number(current.expiresAt) <= now) {
      localStorage.setItem(
        leaseKey,
        JSON.stringify({ owner, expiresAt: now + LEASE_DURATION_MS }),
      );
      const claimed = JSON.parse(localStorage.getItem(leaseKey) ?? "null") as {
        owner?: string;
      } | null;

      if (claimed?.owner === owner) {
        const heartbeat = globalThis.setInterval(() => {
          try {
            const lease = JSON.parse(localStorage.getItem(leaseKey) ?? "null") as {
              owner?: string;
            } | null;
            if (lease?.owner === owner) {
              localStorage.setItem(
                leaseKey,
                JSON.stringify({
                  owner,
                  expiresAt: Date.now() + LEASE_DURATION_MS,
                }),
              );
            }
          } catch {
            // The refresh can continue even if storage becomes unavailable.
          }
        }, LEASE_DURATION_MS / 3);

        try {
          return await callback();
        } finally {
          globalThis.clearInterval(heartbeat);
          try {
            const lease = JSON.parse(localStorage.getItem(leaseKey) ?? "null") as {
              owner?: string;
            } | null;
            if (lease?.owner === owner) localStorage.removeItem(leaseKey);
          } catch {
            // Nothing else can be done when storage is unavailable.
          }
        }
      }
    }

    await wait(LEASE_RETRY_MS + Math.floor(Math.random() * LEASE_RETRY_MS));
  }
};

const withCrossTabLock = async <T>(
  lockName: string,
  callback: () => Promise<T>,
): Promise<T> => {
  const lockManager = (globalThis.navigator as Navigator & {
    locks?: BrowserLockManager;
  } | undefined)?.locks;
  if (lockManager) return lockManager.request(lockName, callback);
  return withStorageLease(lockName, callback);
};

export const createAccessTokenManager = (
  authParams: BlitzWareAuthParams,
  callbacks: AccessTokenManagerCallbacks,
  dependencies: AccessTokenManagerDependencies = defaultDependencies,
) => {
  const {
    clearSession: clearStoredSession,
    getToken: getStoredToken,
    isTokenValid: isStoredTokenValid,
    tryRefreshToken: refreshStoredToken,
  } = dependencies;
  const lockName = `blitzware-token-refresh:${authParams.clientId}`;
  const expireSession = () => {
    clearStoredSession();
    callbacks.onSessionExpired();
  };

  const refreshUnderLock = async (
    options: GetAccessTokenOptions,
  ): Promise<string | null> =>
    withCrossTabLock(lockName, async () => {
      const minValiditySeconds =
        options.minValiditySeconds ?? DEFAULT_MIN_VALIDITY_SECONDS;
      const currentToken = getStoredToken("access_token");

      if (
        options.forceRefresh
        && options.rejectedToken
        && currentToken
        && currentToken !== options.rejectedToken
        && isStoredTokenValid(minValiditySeconds)
      ) {
        return currentToken;
      }

      if (!options.forceRefresh && isStoredTokenValid(minValiditySeconds)) {
        return currentToken;
      }

      if (!getStoredToken("refresh_token")) {
        expireSession();
        return null;
      }

      try {
        const response = await refreshStoredToken(
          authParams.clientId,
          undefined,
          authParams.authBaseUrl,
        );
        callbacks.onSessionRefreshed();
        return response.access_token;
      } catch (error) {
        if (isTerminalRefreshError(error)) {
          expireSession();
          return null;
        }
        throw error;
      }
    });

  const getAccessToken = async (
    options: GetAccessTokenOptions = {},
  ): Promise<string | null> => {
    const minValiditySeconds =
      options.minValiditySeconds ?? DEFAULT_MIN_VALIDITY_SECONDS;
    const currentToken = getStoredToken("access_token");

    if (
      options.forceRefresh
      && options.rejectedToken
      && currentToken
      && currentToken !== options.rejectedToken
      && isStoredTokenValid(minValiditySeconds)
    ) {
      return currentToken;
    }

    if (!options.forceRefresh && isStoredTokenValid(minValiditySeconds)) {
      return currentToken;
    }

    if (!currentToken && !getStoredToken("refresh_token")) return null;

    const existing = inFlightRefreshes.get(lockName);
    if (existing) return existing;

    const refresh = refreshUnderLock(options).finally(() => {
      if (inFlightRefreshes.get(lockName) === refresh) {
        inFlightRefreshes.delete(lockName);
      }
    });
    inFlightRefreshes.set(lockName, refresh);
    return refresh;
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key !== "access_token" && event.key !== "refresh_token") return;

    if (!getStoredToken("access_token") && !getStoredToken("refresh_token")) {
      callbacks.onSessionExpired();
    } else if (isStoredTokenValid()) {
      callbacks.onSessionRefreshed();
    }
  };

  let listening = false;
  return {
    getAccessToken,
    start: () => {
      if (listening) return;
      listening = true;
      globalThis.addEventListener?.("storage", handleStorage);
    },
    dispose: () => {
      if (!listening) return;
      listening = false;
      globalThis.removeEventListener?.("storage", handleStorage);
    },
  };
};
