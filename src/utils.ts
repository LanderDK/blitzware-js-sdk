import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
import { Buffer } from "buffer";
import axios from "axios";

const TOKEN_RE = /[?&]access_token=[^&]+/;
const STATE_RE = /[?&]state=[^&]+/;

export const hasAuthParams = (searchParams = window.location.search): boolean =>
  TOKEN_RE.test(searchParams) && STATE_RE.test(searchParams);

export const generateAuthUrl = (
  { responseType = "token", clientId, redirectUri }: BlitzWareAuthParams,
  state: string
): string => {
  const baseUrl = "https://auth.blitzware.xyz/api/auth/authorize";
  const queryParams = new URLSearchParams({
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${baseUrl}?${queryParams.toString()}`;
};

export const fetchUserInfo = async (
  accessToken: string
): Promise<BlitzWareAuthUser> => {
  try {
    const response = await axios.get(
      `https://auth.blitzware.xyz/api/auth/userinfo`,
      {
        params: {
          access_token: accessToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch user info");
  }
};

export const setToken = (
  type: "access_token" | "refresh_token",
  token: string
) => {
  localStorage.setItem(type, token);
};

export const getToken = (
  type: "access_token" | "refresh_token"
): string | null => {
  return localStorage.getItem(type);
};

export const removeToken = (type: "access_token" | "refresh_token") => {
  localStorage.removeItem(type);
};

const parseJwt = (token: string) => {
  try {
    if (!token) return {};
    const base64Url = token.split(".")[1];
    const payload = Buffer.from(base64Url, "base64");
    const jsonPayload = payload.toString("ascii");
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error(error);
  }
};

const parseExp = (exp: number | string) => {
  if (!exp) return null;
  if (typeof exp !== "number") exp = Number(exp);
  if (isNaN(exp)) return null;
  return new Date(exp * 1000);
};

export const isTokenValid = (): boolean => {
  const token = getToken("access_token");
  if (!token) return false;

  const { exp } = parseJwt(token);
  const expiration = parseExp(exp);
  if (!expiration) return false;
  return expiration > new Date();
};

export const setState = (state: string) => {
  localStorage.setItem("state", state);
};

export const getState = () => {
  return localStorage.getItem("state");
};

export const removeState = () => {
  localStorage.removeItem("state");
};
