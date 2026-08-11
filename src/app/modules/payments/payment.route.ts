import { Router } from "express";

import { PaymentController } from "./payment.controller";

import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";

import { PaymentValidation } from "./payment.validation";

const router = Router();

/**
 * Admin & Super Admin
 * Payment history
 */
router.get(
  "/history",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getAllPayments
);

/**
 * Admin & Super Admin
 * Payment statistics
 */
router.get(
  "/stats",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getPaymentStats
);

/**
 * Customer
 * Create Stripe Checkout Session
 */
router.post(
  "/checkout/:bookingId",
  authGuard,
  roleGuard("user"),
  validateRequest(
    PaymentValidation.createCheckoutSessionValidation
  ),
  PaymentController.createCheckoutSession
);

/**
 * Customer/Admin/Super Admin
 * Get payment by booking
 */
router.get(
  "/:bookingId",
  authGuard,
  validateRequest(
    PaymentValidation.getPaymentValidation
  ),
  PaymentController.getPaymentByBooking
);

export const PaymentRoutes = router;