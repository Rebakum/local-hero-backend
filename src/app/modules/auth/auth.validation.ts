import { z } from "zod";

const registerValidation = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be at most 128 characters"),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{7,20}$/, "Invalid phone number")
      .optional(),
    role: z.enum(["user"]).default("user"),
  }),
});

const loginValidation = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
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
    email: z.string().trim().toLowerCase().email("Invalid email address"),
  }),
});

const resetPasswordValidation = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be at most 128 characters"),
  }),
});

const logoutValidation = z.object({
  body: z.object({}),
});

export type TRegisterPayload = z.infer<typeof registerValidation>["body"];
export type TLoginPayload = z.infer<typeof loginValidation>["body"];
export type TRefreshTokenPayload = z.infer<typeof refreshTokenValidation>;
export type TForgetPasswordPayload = z.infer<typeof forgetPasswordValidation>["body"];
export type TResetPasswordPayload = z.infer<typeof resetPasswordValidation>["body"];

export const AuthValidation = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgetPasswordValidation,
  resetPasswordValidation,
  logoutValidation,
};
