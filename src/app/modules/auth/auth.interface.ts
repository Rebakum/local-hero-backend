import { Role } from "@prisma/client";

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRefreshTokenPayload {
  refreshToken: string;
}

export interface IForgetPasswordPayload {
  email: string;
}

export interface IResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ILogoutPayload {
  refreshToken?: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    approvalStatus: string;
  };
}
