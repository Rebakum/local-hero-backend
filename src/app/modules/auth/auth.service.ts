import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../../../config/prisma";
import config from "../../../config";
import AppError from "../../utils/AppError";
import {
  IRegisterPayload,
  ILoginPayload,
  IRefreshTokenPayload,
  IForgetPasswordPayload,
  IResetPasswordPayload,
  ILogoutPayload,
  IAuthResponse,
} from "./auth.interface";
import { Role } from "@prisma/client";

const generateTokens = (user: { id: string; email: string; role: Role }) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: "refresh" },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

const parseExpirationToMs = (expiresIn: string): number => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
};

const register = async (
  payload: IRegisterPayload,
  userAgent?: string,
  ipAddress?: string
): Promise<IAuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(409, "A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcryptSaltRounds
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
    },
  });

  const { accessToken, refreshToken } = generateTokens(user);

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + parseExpirationToMs(config.jwt.refreshExpiresIn));

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    },
  };
};

const login = async (
  payload: ILoginPayload,
  userAgent?: string,
  ipAddress?: string
): Promise<IAuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = generateTokens(user);

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + parseExpirationToMs(config.jwt.refreshExpiresIn));

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    },
  };
};

const refreshToken = async (
  payload: IRefreshTokenPayload
): Promise<{ accessToken: string; refreshToken: string }> => {
  let decoded: { userId: string; email: string; role: Role; type?: string };

  try {
    decoded = jwt.verify(payload.refreshToken, config.jwt.secret) as {
      userId: string;
      email: string;
      role: Role;
      type?: string;
    };
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  if (decoded.type !== "refresh") {
    throw new AppError(401, "Invalid token type");
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken: payload.refreshToken },
  });

  if (!session || !session.isActive) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (session.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token has expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new AppError(401, "User not found");
  }

  const tokens = generateTokens(user);

  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + parseExpirationToMs(config.jwt.refreshExpiresIn));

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: tokens.refreshToken,
      expiresAt,
    },
  });

  return tokens;
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
      approvalStatus: true,
      category: true,
      experienceYears: true,
      serviceDetails: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const forgetPassword = async (
  payload: IForgetPasswordPayload
): Promise<{ token: string }> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(404, "No account found with this email address");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt,
    },
  });

  return { token: resetToken };
};

const resetPassword = async (
  payload: IResetPasswordPayload
): Promise<void> => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(payload.token)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    config.bcryptSaltRounds
  );

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    }),
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ]);
};

const logout = async (
  userId: string,
  payload: ILogoutPayload
): Promise<void> => {
  if (payload.refreshToken) {
    await prisma.session.deleteMany({
      where: {
        userId,
        refreshToken: payload.refreshToken,
      },
    });
    return;
  }

  // No refresh token available (e.g. cookie already missing/expired) —
  // revoke every active session for this user as a safe fallback so a
  // logout call always actually logs the user out server-side.
  await prisma.session.deleteMany({
    where: { userId },
  });
};

export const AuthService = {
  register,
  login,
  refreshToken,
  getMe,
  forgetPassword,
  resetPassword,
  logout,
};
