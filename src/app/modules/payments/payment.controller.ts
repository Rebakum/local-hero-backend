import { Request, Response } from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../utils/AppError";

import { PaymentService } from "./payment.service";

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const { bookingId } = req.params;

    const result =
      await PaymentService.createCheckoutSession(
        bookingId,
        userId
      );

    sendResponse(
      res,
      201,
      "Checkout session created successfully",
      result
    );
  }
);

const getPaymentByBooking = catchAsync(
  async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    const result =
      await PaymentService.getPaymentByBooking(
        bookingId,
        req.user!
      );

    sendResponse(
      res,
      200,
      "Payment retrieved successfully",
      result
    );
  }
);

const getAllPayments = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await PaymentService.getAllPayments(req.query);

    sendResponse(
      res,
      200,
      "Payment history retrieved successfully",
      result.payments,
      result.meta
    );
  }
);

const getPaymentStats = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await PaymentService.getPaymentStats();

    sendResponse(
      res,
      200,
      "Payment statistics retrieved successfully",
      result
    );
  }
);

const refund = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const result = await PaymentService.refundBooking(
    bookingId,
    req.user!.userId
  );

  sendResponse(
    res,
    200,
    "Payment refunded successfully",
    result
  );
});

const webhook = catchAsync(
  async (req: Request, res: Response) => {
    const signature =
      req.headers["stripe-signature"];

    if (
      !signature ||
      typeof signature !== "string"
    ) {
      throw new AppError(
        400,
        "Missing Stripe signature header"
      );
    }

    /**
     * Because app.ts uses express.raw()
     * req.body should be a Buffer.
     */
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(
        400,
        "Stripe webhook body must be a raw Buffer"
      );
    }

    const result =
      await PaymentService.handleWebhookEvent(
        req.body,
        signature
      );

    res.status(200).json(result);
  }
);

export const PaymentController = {
  createCheckoutSession,
  getPaymentByBooking,
  getAllPayments,
  getPaymentStats,
  refund,
  webhook,
};