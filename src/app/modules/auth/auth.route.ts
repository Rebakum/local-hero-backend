import { Router } from "express";
import { AuthController } from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { AuthValidation } from "./auth.validation";
import authGuard from "../../middlewares/authGuard";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.registerValidation),
  AuthController.register
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidation),
  AuthController.login
);

router.post("/refresh-token", AuthController.refreshToken);

router.get("/me", authGuard, AuthController.getMe);

router.post(
  "/forget-password",
  validateRequest(AuthValidation.forgetPasswordValidation),
  AuthController.forgetPassword
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordValidation),
  AuthController.resetPassword
);

router.post("/logout", authGuard, AuthController.logout);

export const AuthRoutes = router;
