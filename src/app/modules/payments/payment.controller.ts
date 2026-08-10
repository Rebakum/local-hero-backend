import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../utils/AppError";
import { PaymentService } from "./payment.service";

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { bookingId } = req.params;
  const result = await PaymentService.createCheckoutSession(bookingId, userId);
  sendResponse(res, 201, "Checkout session created successfully", result);
});

const getPaymentByBooking = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const result = await PaymentService.getPaymentByBooking(bookingId, req.user!);
  sendResponse(res, 200, "Payment retrieved successfully", result);
});

// Stripe posts here with the raw body + a signature header. This route is
// mounted with express.raw() (see payment.route.ts) so req.body is a Buffer,
// not parsed JSON.
const webhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    throw new AppError(400, "Missing Stripe signature header");
  }

  const result = await PaymentService.handleWebhookEvent(req.body as Buffer, signature);
  res.status(200).json(result);
});

export const PaymentController = {
  createCheckoutSession,
  getPaymentByBooking,
  webhook,
};
