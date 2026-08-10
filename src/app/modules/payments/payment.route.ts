import { Router } from "express";
import { PaymentController } from "./payment.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateCheckoutSessionValidation,
  GetPaymentValidation,
} from "./payment.interface";

const router = Router();

// NOTE: the Stripe webhook endpoint (POST /api/v1/payments/webhook) is
// intentionally NOT registered here. Stripe needs the raw, unparsed request
// body to verify its signature, so it's mounted directly in app.ts with
// express.raw() *before* the global express.json() middleware runs.

router.post(
  "/checkout/:bookingId",
  authGuard,
  roleGuard("user"),
  validateRequest(CreateCheckoutSessionValidation),
  PaymentController.createCheckoutSession
);

router.get(
  "/:bookingId",
  authGuard,
  validateRequest(GetPaymentValidation),
  PaymentController.getPaymentByBooking
);

export const PaymentRoutes = router;
