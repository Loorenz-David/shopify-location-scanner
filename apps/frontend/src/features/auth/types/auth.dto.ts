export interface AuthUserDto {
  id: string;
  username: string;
  role: "admin" | "manager" | "worker" | "seller";
  shopId: string | null;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSessionDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

export interface RegisterRequestDto {
  username: string;
  password: string;
  key?: string;
}

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface RefreshRequestDto {
  refreshToken: string;
}

export interface LogoutRequestDto {
  refreshToken: string;
}

export interface LogoutResponseDto {
  ok: boolean;
}

export interface CurrentUserResponseDto {
  user: AuthUserDto;
}
