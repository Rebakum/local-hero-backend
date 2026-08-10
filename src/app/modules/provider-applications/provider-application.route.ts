import { Router } from "express";
import { ProviderApplicationController } from "./provider-application.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { ProviderApplicationValidation } from "./provider-application.validation";

const router = Router();

// User routes
router.post(
  "/",
  authGuard,
  roleGuard("user"),
  validateRequest(ProviderApplicationValidation.createProviderApplicationValidation),
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
  validateRequest(ProviderApplicationValidation.updateProviderApplicationValidation),
  ProviderApplicationController.updateMyApplication
);

// Admin routes
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(ProviderApplicationValidation.getAllProviderApplicationsQueryValidation),
  ProviderApplicationController.getAll
);

router.get(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(ProviderApplicationValidation.getProviderApplicationValidation),
  ProviderApplicationController.getById
);

router.patch(
  "/:id/approve",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(ProviderApplicationValidation.approveProviderApplicationValidation),
  ProviderApplicationController.approve
);

router.patch(
  "/:id/reject",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(ProviderApplicationValidation.rejectProviderApplicationValidation),
  ProviderApplicationController.reject
);

export const ProviderApplicationRoutes = router;
