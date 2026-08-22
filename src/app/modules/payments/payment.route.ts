import { Router } from "express";

import { PaymentController } from "./payment.controller";

import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";

import { PaymentValidation } from "./payment.validation";

const router = Router();


router.get(
  "/history",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getAllPayments
);


router.get(
  "/stats",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  PaymentController.getPaymentStats
);


router.post(
  "/checkout/:bookingId",
  authGuard,
  roleGuard("user"),
  validateRequest(
    PaymentValidation.createCheckoutSessionValidation
  ),
  PaymentController.createCheckoutSession
);


router.get(
  "/:bookingId",
  authGuard,
  validateRequest(
    PaymentValidation.getPaymentValidation
  ),
  PaymentController.getPaymentByBooking
);


router.post(
  "/:bookingId/refund",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(
    PaymentValidation.refundPaymentValidation
  ),
  PaymentController.refund
);

export const PaymentRoutes = router;