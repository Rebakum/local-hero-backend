import { Router } from "express";
import { SuperAdminController } from "./super-admin.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { SuperAdminValidation } from "./super-admin.validation";

const router = Router();

router.get(
  "/users",
  authGuard,
  roleGuard("SUPER_ADMIN"),
  SuperAdminController.getPendingUsers
);

router.patch(
  "/users/:id/approve",
  authGuard,
  roleGuard("SUPER_ADMIN"),
  SuperAdminController.approveUser
);

router.patch(
  "/users/:id/reject",
  authGuard,
  roleGuard("SUPER_ADMIN"),
  SuperAdminController.rejectUser
);

router.patch(
  "/users/:id/role",
  authGuard,
  roleGuard("SUPER_ADMIN"),
  validateRequest(SuperAdminValidation.changeRoleValidation),
  SuperAdminController.changeUserRole
);

router.get(
  "/system/health",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  SuperAdminController.getSystemHealth
);

export const SuperAdminRoutes = router;
