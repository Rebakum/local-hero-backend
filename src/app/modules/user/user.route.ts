import { Router } from "express";
import { UserController } from "./user.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";

const router = Router();

router.get("/me", authGuard, UserController.getProfile);

router.patch(
  "/me",
  authGuard,
  validateRequest(UserValidation.updateProfileValidation),
  UserController.updateProfile
);

router.delete(
  "/me",
  authGuard,
  validateRequest(UserValidation.deleteProfileValidation),
  UserController.deleteProfile
);

router.post(
  "/apply-provider",
  authGuard,
  roleGuard("user"),
  validateRequest(UserValidation.applyProviderValidation),
  UserController.applyProvider
);

export const UserRoutes = router;
