export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type MethodWithoutPayload = "GET";
export type MethodWithPayload = Exclude<HttpMethod, MethodWithoutPayload>;

export interface RequestOptions {
  requiresAuth?: boolean;
  headers?: HeadersInit;
}

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

export interface AccessTokenClaims {
  userId?: string;
  username?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface ApiClient {
  request<TResponse>(
    method: MethodWithoutPayload,
    endpoint: string,
    options?: RequestOptions,
  ): Promise<TResponse>;
  request<TResponse, TPayload = unknown>(
    method: MethodWithPayload,
    endpoint: string,
    payload?: TPayload,
    options?: RequestOptions,
  ): Promise<TResponse>;
  get<TResponse>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<TResponse>;
  post<TResponse, TPayload = unknown>(
    endpoint: string,
    payload?: TPayload,
    options?: RequestOptions,
  ): Promise<TResponse>;
  put<TResponse, TPayload = unknown>(
    endpoint: string,
    payload?: TPayload,
    options?: RequestOptions,
  ): Promise<TResponse>;
  patch<TResponse, TPayload = unknown>(
    endpoint: string,
    payload?: TPayload,
    options?: RequestOptions,
  ): Promise<TResponse>;
  delete<TResponse, TPayload = unknown>(
    endpoint: string,
    payload?: TPayload,
    options?: RequestOptions,
  ): Promise<TResponse>;
}

export interface ApiClientErrorDetails {
  status: number;
  endpoint: string;
  method: HttpMethod;
  data?: unknown;
}
