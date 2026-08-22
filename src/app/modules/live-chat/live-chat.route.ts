import { Router } from "express";
import optionalAuth from "../../middlewares/optionalAuth";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import { LiveChatController } from "./live-chat.controller";

const router = Router();


router.post("/threads", optionalAuth, LiveChatController.create);
router.get("/threads/:id", LiveChatController.get);

// Anyone may send a message; admins get the ADMIN role automatically.
router.post("/threads/:id/messages", optionalAuth, LiveChatController.message);

// Visitor requests a human (also triggered automatically by the AI).
router.post("/threads/:id/handoff", optionalAuth, LiveChatController.handoff);

// Admin controls.
router.get("/threads", authGuard, roleGuard("ADMIN", "SUPER_ADMIN"), LiveChatController.list);
router.patch("/threads/:id/resolve", authGuard, roleGuard("ADMIN", "SUPER_ADMIN"), LiveChatController.resolve);
router.patch("/threads/:id/reactivate", authGuard, roleGuard("ADMIN", "SUPER_ADMIN"), LiveChatController.reactivate);
router.patch("/threads/:id/close", authGuard, roleGuard("ADMIN", "SUPER_ADMIN"), LiveChatController.close);

export const LiveChatRoutes = router;