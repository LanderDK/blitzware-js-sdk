import { BlitzWareAuthParams, BlitzWareAuthUser } from "./types";
import {
  generateAuthUrl,
  isTokenValid,
  fetchUserInfo,
  setToken,
  getToken,
  removeToken,
  getState,
  setState,
  removeState,
  hasAuthParams,
} from "./utils";
import { nanoid } from "nanoid";

export class BlitzWareAuth {
  private authParams: BlitzWareAuthParams;
  private state: string;
  private user: BlitzWareAuthUser | null = null;
  private isAuthenticated = isTokenValid();
  private isLoading: boolean = true;

  constructor(authParams: BlitzWareAuthParams) {
    this.authParams = authParams;
    this.state = getState() || nanoid();
  }

  public async handleRedirect(): Promise<void> {
    if (hasAuthParams()) {
      const urlParams = new URLSearchParams(window.location.search);

      const state = urlParams.get("state");
      if (state !== this.state) {
        this.setIsAuthenticated(false);
        this.setIsLoading(false);
        return;
      }

      const access_token = urlParams.get("access_token");
      if (access_token) {
        setToken("access_token", access_token);
        this.setIsAuthenticated(true);
        const data = await fetchUserInfo(access_token);
        this.setUser(data);
        this.setIsLoading(false);
      } else {
        this.setIsAuthenticated(false);
        this.setIsLoading(false);
      }

      const refresh_token = urlParams.get("refresh_token");
      if (refresh_token) setToken("refresh_token", refresh_token);
    } else {
      this.setIsAuthenticated(isTokenValid());
      if (isTokenValid()) {
        const data = await fetchUserInfo(getToken("access_token") as string);
        this.setUser(data);
        this.setIsLoading(false);
      } else {
        this.setIsLoading(false);
      }
    }
  }

  public login(): void {
    const newState = nanoid();
    setState(newState);
    const authUrl = generateAuthUrl(this.authParams, newState);
    window.location.href = authUrl;
  }

  public logout(): void {
    removeToken("access_token");
    removeToken("refresh_token");
    removeState();
    this.setIsAuthenticated(false);
    this.user = null;
    window.location.reload();
  }

  private setUser(value: BlitzWareAuthUser): void {
    this.user = value;
  }

  public getUser(): BlitzWareAuthUser | null {
    return this.user;
  }

  private setIsAuthenticated(value: boolean): void {
    this.isAuthenticated = value;
  }

  public getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private setIsLoading(value: boolean): void {
    this.isLoading = value;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }
}
