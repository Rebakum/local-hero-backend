import express, { Router } from "express";
import { PaymentController } from "./payment.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentValidation } from "./payment.validation";

const router = Router();

// Stripe Webhook Endpoint (Must receive raw body for signature verification)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.webhook
);

// Admin & Super Admin: Get all payment history with pagination & filters
router.get(
  "/history",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getAllPayments
);

// Admin & Super Admin: Get overall payment statistics/summary
router.get(
  "/stats",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getPaymentStats
);

// Customer Checkout Creation
router.post(
  "/checkout/:bookingId",
  authGuard,
  roleGuard("user"),
  validateRequest(PaymentValidation.createCheckoutSessionValidation),
  PaymentController.createCheckoutSession
);

// Get Payment Details by Booking ID (Customer or Admin/Super Admin)
router.get(
  "/:bookingId",
  authGuard,
  validateRequest(PaymentValidation.getPaymentValidation),
  PaymentController.getPaymentByBooking
);

export const PaymentRoutes = router;