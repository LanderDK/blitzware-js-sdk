export interface BlitzWareAuthParams {
  responseType?: "code" | "token";
  clientId: string;
  redirectUri: string;
  authBaseUrl?: string;
}

export interface GetAccessTokenOptions {
  minValiditySeconds?: number;
  forceRefresh?: boolean;
  rejectedToken?: string;
}

export interface BlitzWareAuthUser {
  id: string;
  username: string;
  email?: string;
  roles?: string[];
}

/**
 * RFC 7662 OAuth2 Token Introspection Response
 */
export interface TokenIntrospectionResponse {
  active: boolean;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  scope?: string;
}

export class BlitzWareAuthError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "BlitzWareAuthError";
  }
}
