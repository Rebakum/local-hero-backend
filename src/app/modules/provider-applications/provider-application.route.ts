import { Router } from "express";
import { ProviderApplicationController } from "./provider-application.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateProviderApplicationValidation,
  UpdateProviderApplicationValidation,
  GetProviderApplicationValidation,
  ApproveProviderApplicationValidation,
  RejectProviderApplicationValidation,
} from "./provider-application.interface";

const router = Router();

// User routes
router.post(
  "/",
  authGuard,
  roleGuard("user"),
  validateRequest(CreateProviderApplicationValidation),
  ProviderApplicationController.create
);

router.get(
  "/me",
  authGuard,
  ProviderApplicationController.getMyApplication
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("user"),
  validateRequest(UpdateProviderApplicationValidation),
  ProviderApplicationController.updateMyApplication
);

// Admin routes
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  ProviderApplicationController.getAll
);

router.get(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetProviderApplicationValidation),
  ProviderApplicationController.getById
);

router.patch(
  "/:id/approve",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(ApproveProviderApplicationValidation),
  ProviderApplicationController.approve
);

router.patch(
  "/:id/reject",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(RejectProviderApplicationValidation),
  ProviderApplicationController.reject
);

export const ProviderApplicationRoutes = router;
