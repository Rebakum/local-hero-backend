import { Router } from "express";
import { MessagingController } from "./messaging.controller";
import authGuard from "../../middlewares/authGuard";
import validateRequest from "../../middlewares/validateRequest";
import { MessagingValidation } from "./messaging.validation";

const router = Router();

router.post(
  "/",
  authGuard,
  validateRequest(MessagingValidation.createConversationValidation),
  MessagingController.createConversation
);

router.get("/me", authGuard, MessagingController.getMyConversations);

router.patch(
  "/:id/read",
  authGuard,
  validateRequest(MessagingValidation.getConversationValidation),
  MessagingController.markConversationRead
);

router.get(
  "/:id/messages",
  authGuard,
  validateRequest(MessagingValidation.getConversationValidation),
  MessagingController.getMessages
);

router.post(
  "/:id/messages",
  authGuard,
  validateRequest(MessagingValidation.sendMessageValidation),
  MessagingController.sendMessage
);

router.get(
  "/:id",
  authGuard,
  validateRequest(MessagingValidation.getConversationValidation),
  MessagingController.getConversationById
);

export const MessagingRoutes = router;
