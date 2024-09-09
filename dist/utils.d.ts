import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
export declare const hasAuthParams: (searchParams?: string) => boolean;
export declare const generateAuthUrl: ({ responseType, clientId, redirectUri }: BlitzWareAuthParams, state: string) => string;
export declare const fetchUserInfo: (accessToken: string) => Promise<BlitzWareAuthUser>;
export declare const setToken: (type: "access_token" | "refresh_token", token: string) => void;
export declare const getToken: (type: "access_token" | "refresh_token") => string | null;
export declare const removeToken: (type: "access_token" | "refresh_token") => void;
export declare const isTokenValid: () => boolean;
export declare const setState: (state: string) => void;
export declare const getState: () => string | null;
export declare const removeState: () => void;
//# sourceMappingURL=utils.d.ts.map