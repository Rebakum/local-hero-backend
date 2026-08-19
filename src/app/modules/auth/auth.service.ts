import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../../../config/prisma";
import config from "../../../config";
import AppError from "../../utils/AppError";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../utils/email";
import {
  IRegisterPayload,
  ILoginPayload,
  IRefreshTokenPayload,
  IForgetPasswordPayload,
  IResetPasswordPayload,
  ILogoutPayload,
  IAuthResponse,
  IRegisterResponse,
  IVerifyEmailPayload,
  IResendVerificationPayload,
} from "./auth.interface";
import { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { NotificationService } from "../notifications/notification.service";

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

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateVerificationToken = (): string =>
  crypto.randomBytes(32).toString("hex");

// Verification links must be valid for exactly 1 hour.
const VERIFICATION_TTL_MS = 1 * 60 * 60 * 1000;

// Minimum wait before the verification email can be resent (spam guard).
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

const issueVerification = async (
  userId: string,
  client: Prisma.TransactionClient = prisma
): Promise<string> => {
  const verificationToken = generateVerificationToken();

  const verificationExpiresAt = new Date(
    Date.now() + VERIFICATION_TTL_MS
  );

  await client.user.update({
    where: { id: userId },
    data: {
      verificationToken: hashToken(verificationToken),
      verificationExpiresAt,
    },
  });

  return verificationToken;
};

const register = async (
  payload: IRegisterPayload,
  _userAgent?: string,
  _ipAddress?: string
): Promise<IRegisterResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  // Existing verified account: refuse to create a duplicate.
  if (existingUser?.emailVerified) {
    throw new AppError(
      409,
      "An account with this email already exists. Please sign in."
    );
  }

  // Existing UNVERIFIED account: never create a duplicate. Rotate the
  // verification token and resend the link so the user can pick up where
  // they left off.
  if (existingUser) {
    const verificationToken = await issueVerification(existingUser.id);

    void sendVerificationEmail(
      existingUser.email,
      existingUser.name,
      verificationToken
    ).catch((error) =>
      console.error("[Auth] Failed to resend verification email:", error)
    );

    return {
      accountCreated: false,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        approvalStatus: existingUser.approvalStatus,
        emailVerified: false,
      },
    };
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcryptSaltRounds
  );

  // User creation and verification-token storage must be atomic: if the
  // token write fails, the whole registration rolls back so we never leave
  // an orphan user stuck at emailVerified=false with no working link.
  const { user, verificationToken } = await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: hashedPassword,
          phone: payload.phone,
          emailVerified: false,
        },
      });

      const verificationToken = await issueVerification(user.id, tx);

      return { user, verificationToken };
    }
  );

  // A failed send must never roll back the account. Log it so the user can
  // request a new link via the resend endpoint.
  void sendVerificationEmail(
    user.email,
    user.name,
    verificationToken
  ).catch((error) =>
    console.error("[Auth] Failed to send verification email:", error)
  );

  // Welcome notification (IN_APP + bell).
  void NotificationService.create({
    userId: user.id,
    type: "WELCOME",
    title: "Welcome to LocalHero",
    body: `Thanks for joining, ${user.name}. Verify your email to start posting jobs and getting quotes from vetted local pros.`,
  }).catch(() => undefined);

  return {
    accountCreated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      emailVerified: false,
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
    throw new AppError(
      401,
      "No account found with this email. Please sign up first."
    );
  }

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password.");
  }

  if (!user.emailVerified) {
    throw new AppError(
      403,
      "Please verify your email address before signing in."
    );
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
      emailVerified: true,
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
      emailVerified: true,
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

const validateEmailVerification = async (
  payload: IVerifyEmailPayload
): Promise<IRegisterResponse["user"]> => {
  const hashedToken = hashToken(payload.token);

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: hashedToken,
    },
  });

  if (!user) {
    throw new AppError(
      400,
      "Verification link is invalid or has already been used. Please request a new one."
    );
  }

  if (user.emailVerified) {
    throw new AppError(
      400,
      "This email is already verified. Please sign in."
    );
  }

  if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
    throw new AppError(
      400,
      "Verification link has expired. Please request a new one."
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    emailVerified: false,
  };
};

const verifyEmail = async (
  payload: IVerifyEmailPayload
): Promise<IRegisterResponse["user"]> => {
  const hashedToken = hashToken(payload.token);

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: hashedToken,
    },
  });

  if (!user) {
    throw new AppError(
      400,
      "Verification link is invalid or has already been used. Please request a new one."
    );
  }

  if (user.emailVerified) {
    throw new AppError(
      400,
      "This email is already verified. Please sign in."
    );
  }

  if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
    throw new AppError(
      400,
      "Verification link has expired. Please request a new one."
    );
  }

  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      verificationToken: hashedToken,
      emailVerified: false,
    },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpiresAt: null,
    },
  });

  if (result.count === 0) {
    throw new AppError(
      400,
      "Verification link is invalid or has already been used. Please request a new one."
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    emailVerified: true,
  };
};

const resendVerificationEmail = async (
  payload: IResendVerificationPayload
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  // Always respond generically so the endpoint can't be used to probe
  // which emails have an account.
  if (!user || user.emailVerified) {
    return;
  }

  // Cooldown: because every token is issued with a fixed 1-hour lifetime,
  // the last send time is derivable from verificationExpiresAt. Reject
  // rapid repeats to prevent email spam.
  const sentAt = user.verificationExpiresAt
    ? user.verificationExpiresAt.getTime() - VERIFICATION_TTL_MS
    : 0;
  if (
    sentAt > 0 &&
    Date.now() - sentAt < VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    throw new AppError(
      429,
      "A verification email was sent recently. Please wait a minute before requesting another one."
    );
  }

  // issueVerification overwrites (invalidates) the previous token and
  // stamps a fresh 1-hour expiry.
  const verificationToken = await issueVerification(user.id);

  await sendVerificationEmail(
    user.email,
    user.name,
    verificationToken
  );
};

const forgetPassword = async (
  payload: IForgetPasswordPayload
): Promise<{ token?: string }> => {
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

  void sendPasswordResetEmail(user.email, user.name, resetToken).catch(
    (error) =>
      console.error("[Auth] Failed to send password reset email:", error)
  );

  // In development only, return the token so the flow can be exercised
  // without a real inbox. Never expose it in production.
  if (config.nodeEnv === "production") {
    return {};
  }

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
  validateEmailVerification,
  verifyEmail,
  resendVerificationEmail,
};
