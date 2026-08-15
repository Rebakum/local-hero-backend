import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";
import config from "../../../config";

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

const isProduction = config.nodeEnv === "production";

// In production the frontend and backend are deployed on different origins,
// so the browser only sends/receives these cookies cross-site when
// SameSite=None + Secure are set. In development (same host or localhost)
// "lax" is safer and works with plain http.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
};

const register = catchAsync(async (req: Request, res: Response) => {
  // Registration deliberately does NOT create a session or set auth cookies:
  // the account is unusable until the email address has been verified.
  const result = await AuthService.register(req.body);

  sendResponse(
    res,
    201,
    "Account created. Please verify your email address before logging in.",
    result
  );
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(
    req.body,
    req.headers["user-agent"],
    req.ip
  );

  res.cookie("accessToken", result.accessToken, {
    ...cookieOptions,
    maxAge: parseExpirationToMs(config.jwt.accessExpiresIn),
  });

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieOptions,
    maxAge: parseExpirationToMs(config.jwt.refreshExpiresIn),
  });

  sendResponse(res, 200, "Login successful", {
    user: result.user,
    accessToken: result.accessToken,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    sendResponse(res, 400, "Verification token is required", null);
    return;
  }

  const user = await AuthService.verifyEmail({ token });

  sendResponse(res, 200, "Email verified successfully. You can now log in.", {
    user,
  });
});

const resendVerification = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resendVerificationEmail(req.body);

  sendResponse(
    res,
    200,
    "If your email matches an unverified account, a new verification link has been sent.",
    null
  );
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;

  if (!token) {
    sendResponse(res, 401, "Refresh token not provided", null);
    return;
  }

  const result = await AuthService.refreshToken({ refreshToken: token });

  res.cookie("accessToken", result.accessToken, {
    ...cookieOptions,
    maxAge: parseExpirationToMs(config.jwt.accessExpiresIn),
  });

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieOptions,
    maxAge: parseExpirationToMs(config.jwt.refreshExpiresIn),
  });

  sendResponse(res, 200, "Token refreshed successfully", {
    accessToken: result.accessToken,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const result = await AuthService.getMe(userId);

  sendResponse(res, 200, "Profile retrieved successfully", result);
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgetPassword(req.body);

  sendResponse(
    res,
    200,
    "If an account with that email exists, a reset link has been sent",
    null
  );
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body);

  sendResponse(
    res,
    200,
    "Password reset successful. Please login with your new password",
    null
  );
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  await AuthService.logout(userId, { refreshToken: token });

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  sendResponse(res, 200, "Logged out successfully", null);
});

export const AuthController = {
  register,
  login,
  refreshToken,
  getMe,
  forgetPassword,
  resetPassword,
  logout,
  verifyEmail,
  resendVerification,
};
