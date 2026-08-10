import { Router } from "express";
import { AdminController } from "./admin.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";

const router = Router();

router.get(
  "/users",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  AdminController.getAllUsers
);

router.patch(
  "/users/:id/approve",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  AdminController.approveUser
);

router.patch(
  "/users/:id/reject",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  AdminController.rejectUser
);

router.delete(
  "/users/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  AdminController.deleteUser
);

router.get(
  "/dashboard/stats",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  AdminController.getDashboardStats
);

export const AdminRoutes = router;
