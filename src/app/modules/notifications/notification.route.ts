import { Router } from "express";
import { NotificationController } from "./notification.controller";
import authGuard from "../../middlewares/authGuard";

const router = Router();

router.get("/me", authGuard, NotificationController.getMyNotifications);

router.patch("/read-all", authGuard, NotificationController.markAllAsRead);

router.patch("/:id/read", authGuard, NotificationController.markAsRead);

export const NotificationRoutes = router;
