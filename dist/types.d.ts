export interface BlitzWareAuthParams {
    responseType?: "code" | "token";
    clientId: string;
    redirectUri: string;
}
export interface BlitzWareAuthUser {
    id: string;
    username: string;
    email?: string;
    roles?: string[];
}
//# sourceMappingURL=types.d.ts.map