import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { SubscriptionValidation } from "./subscription.validation";

const router = Router();

// Active plans (any authenticated user can browse).
router.get(
  "/plans",
  authGuard,
  SubscriptionController.getPlans
);

// Featured add-on options (7/30/90 days).
router.get(
  "/featured-addons",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.getFeaturedAddons
);

// Provider: my subscription.
router.get(
  "/me",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.getMySubscription
);

// Provider: create a subscription-mode Stripe Checkout session.
router.post(
  "/checkout",
  authGuard,
  roleGuard("serviceProvider"),
  validateRequest(SubscriptionValidation.checkoutValidation),
  SubscriptionController.checkout
);

// Provider: create a one-time Stripe Checkout session for a Featured add-on.
router.post(
  "/feature-checkout",
  authGuard,
  roleGuard("serviceProvider"),
  validateRequest(SubscriptionValidation.featureCheckoutValidation),
  SubscriptionController.featureCheckout
);

// Provider: change to another paid plan.
router.post(
  "/change-plan",
  authGuard,
  roleGuard("serviceProvider"),
  validateRequest(SubscriptionValidation.changePlanValidation),
  SubscriptionController.changePlan
);

// Provider: cancel at period end.
router.post(
  "/cancel",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.cancel
);

// Provider: resume a scheduled-cancel subscription.
router.post(
  "/resume",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.resume
);

// Provider: open Stripe Billing Portal.
router.post(
  "/billing-portal",
  authGuard,
  roleGuard("serviceProvider"),
  SubscriptionController.billingPortal
);

// Admin: list all subscriptions.
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.listSubscriptionsQueryValidation),
  SubscriptionController.getAll
);

// Admin: create / upsert a subscription for a professional.
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.createSubscriptionValidation),
  SubscriptionController.create
);

// Admin: update a subscription.
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SubscriptionValidation.updateSubscriptionValidation),
  SubscriptionController.update
);

export const SubscriptionRoutes = router;
