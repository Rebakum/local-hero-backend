import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { SubscriptionValidation } from "./subscription.validation";

const router = Router();

// Provider: my subscription
router.get(
  "/me",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.getMySubscription
);

// Admin: list all subscriptions
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.listSubscriptionsQueryValidation),
  SubscriptionController.getAll
);

// Admin: create / upsert a subscription for a professional
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.createSubscriptionValidation),
  SubscriptionController.create
);

// Admin: update a subscription
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.updateSubscriptionValidation),
  SubscriptionController.update
);

export const SubscriptionRoutes = router;
