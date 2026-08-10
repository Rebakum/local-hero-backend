import { z } from "zod";

const registerValidation = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    phone: z.string().optional(),
  }),
});

const loginValidation = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

const refreshTokenValidation = z.object({
  cookies: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

const forgetPasswordValidation = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

const resetPasswordValidation = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
  }),
});

const logoutValidation = z.object({
  body: z.object({}).optional(),
});

export const AuthValidation = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgetPasswordValidation,
  resetPasswordValidation,
  logoutValidation,
};
