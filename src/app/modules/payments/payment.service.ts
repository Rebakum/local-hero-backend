import Stripe from "stripe";
import prisma from "../../../config/prisma";
import stripe from "../../../config/stripe";
import config from "../../../config";
import AppError from "../../utils/AppError";
import { sendTransactionalEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";

const formatGBP = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

// Notify the customer (and the provider on success) about a payment event.
const notifyPaymentStatus = async (
  bookingId: string,
  status: "success" | "failed" | "refunded"
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { name: true, email: true } },
      professional: {
        select: { userId: true, name: true },
      },
    },
  });
  if (!booking) return;

  const amount = booking.priceInPence ? ` of ${formatGBP(booking.priceInPence)}` : "";
  const amountInPence = booking.priceInPence ?? undefined;

  if (status === "success") {
    void NotificationService.create({
      userId: booking.customerId,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      body: `Your payment${amount} for the ${booking.trade} booking went through.`,
      data: { bookingId },
    }).catch(() => undefined);

    if (booking.customer?.email) {
      void sendTransactionalEmail("PAYMENT_SUCCESS_CUSTOMER", booking.customer.email, {
        customerName: booking.customer.name,
        trade: booking.trade,
        amountInPence,
      });
    }

    if (booking.professional?.userId) {
      void NotificationService.create({
        userId: booking.professional.userId,
        type: "PAYMENT_SUCCESS",
        title: "Payment received",
        body: `You received a payment${amount} for the ${booking.trade} booking.`,
        data: { bookingId },
      }).catch(() => undefined);

      const providerUser = await prisma.user.findUnique({
        where: { id: booking.professional.userId },
        select: { email: true, name: true },
      });
      if (providerUser?.email) {
        void sendTransactionalEmail("PAYMENT_SUCCESS_PROVIDER", providerUser.email, {
          professionalName: providerUser.name,
          trade: booking.trade,
          amountInPence,
        });
      }
    }
  } else if (status === "failed") {
    void NotificationService.create({
      userId: booking.customerId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      body: `Your payment${amount} for the ${booking.trade} booking could not be completed.`,
      data: { bookingId },
    }).catch(() => undefined);

    if (booking.customer?.email) {
      void sendTransactionalEmail("PAYMENT_FAILED", booking.customer.email, {
        customerName: booking.customer.name,
        trade: booking.trade,
        amountInPence,
      });
    }
  } else {
    void NotificationService.create({
      userId: booking.customerId,
      type: "PAYMENT_REFUNDED",
      title: "Refund issued",
      body: `Your payment${amount} for the ${booking.trade} booking has been refunded.`,
      data: { bookingId },
    }).catch(() => undefined);

    if (booking.customer?.email) {
      void sendTransactionalEmail("REFUND_ISSUED", booking.customer.email, {
        customerName: booking.customer.name,
        trade: booking.trade,
        amountInPence,
      });
    }
  }
};

const createCheckoutSession = async (
  bookingId: string,
  customerId: string
) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      payment: true,
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.customerId !== customerId) {
    throw new AppError(
      403,
      "You can only pay for your own booking"
    );
  }

  if (booking.status !== "ACCEPTED") {
    throw new AppError(
      400,
      "This booking is not ready for payment yet. It must be accepted by the professional first."
    );
  }

  if (!booking.priceInPence || booking.priceInPence <= 0) {
    throw new AppError(
      400,
      "This booking doesn't have a quoted price yet."
    );
  }

  if (booking.payment?.status === "PAID") {
    throw new AppError(
      400,
      "This booking has already been paid for"
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    payment_method_types: ["card"],

    customer_email: booking.email,

    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: booking.priceInPence,

          product_data: {
            name: `LocalHero Booking - ${booking.trade}`,
            description: booking.description.slice(0, 500),
          },
        },

        quantity: 1,
      },
    ],

    /**
     * IMPORTANT
     *
     * bookingId is stored in Stripe Checkout Session metadata.
     */
    metadata: {
      bookingId: booking.id,
      customerId: booking.customerId,
    },

    /**
     * IMPORTANT
     *
     * bookingId is ALSO stored in PaymentIntent metadata.
     */
    payment_intent_data: {
      metadata: {
        bookingId: booking.id,
        customerId: booking.customerId,
      },
    },

    success_url:
      `${config.clientUrl}/dashboard/user/bookings` +
      `?payment=success&bookingId=${booking.id}`,

    cancel_url:
      `${config.clientUrl}/dashboard/user/bookings` +
      `?payment=cancelled&bookingId=${booking.id}`,
  });

  if (!session.url) {
    throw new AppError(
      500,
      "Stripe checkout URL could not be created"
    );
  }

  const payment = await prisma.payment.upsert({
    where: {
      bookingId: booking.id,
    },

    update: {
      amountInPence: booking.priceInPence,
      currency: "gbp",
      status: "PENDING",
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      paidAt: null,
    },

    create: {
      bookingId: booking.id,
      amountInPence: booking.priceInPence,
      currency: "gbp",
      status: "PENDING",
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    payment,
  };
};

/**
 * Get payment by booking
 */
const getPaymentByBooking = async (
  bookingId: string,
  requester: {
    userId: string;
    role: string;
  }
) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    include: {
      payment: true,
    },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const isAdmin =
    requester.role === "ADMIN" ||
    requester.role === "SUPER_ADMIN";

  if (
    booking.customerId !== requester.userId &&
    !isAdmin
  ) {
    throw new AppError(
      403,
      "You are not allowed to view this payment"
    );
  }

  return booking.payment;
};

/**
 * Get all payments
 */
const getAllPayments = async (query: {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
}) => {
  const page = Math.max(
    parseInt(query.page || "1", 10),
    1
  );

  const limit = Math.min(
    Math.max(
      parseInt(query.limit || "10", 10),
      1
    ),
    100
  );

  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();

    where.OR = [
      {
        booking: {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        booking: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        stripeSessionId: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        stripePaymentIntentId: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,

      skip,

      take: limit,

      include: {
        booking: {
          select: {
            id: true,
            fullName: true,
            email: true,
            trade: true,
            status: true,

            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },

            professional: {
              select: {
                id: true,
                name: true,
                trade: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  return {
    payments,

    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

/**
 * Payment statistics
 */
const getPaymentStats = async () => {
  const [
    totalRevenue,
    paidCount,
    pendingCount,
    failedCount,
    refundedCount,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: {
        amountInPence: true,
      },

      where: {
        status: "PAID",
      },
    }),

    prisma.payment.count({
      where: {
        status: "PAID",
      },
    }),

    prisma.payment.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.payment.count({
      where: {
        status: "FAILED",
      },
    }),

    prisma.payment.count({
      where: {
        status: "REFUNDED",
      },
    }),
  ]);

  return {
    totalRevenueInPence:
      totalRevenue._sum.amountInPence || 0,

    paidCount,

    pendingCount,

    failedCount,

    refundedCount,
  };
};

/**
 * Mark payment failed.
 *
 * Only PENDING payments can become FAILED.
 */
const markPaymentFailed = async (
  bookingId: string
) => {
  await prisma.payment.updateMany({
    where: {
      bookingId,
      status: "PENDING",
    },

    data: {
      status: "FAILED",
    },
  });
};

/**
 * Refund a booking's payment (admin/super-admin).
 *
 * Creates a Stripe refund against the original PaymentIntent, marks the
 * payment REFUNDED, notifies the customer, and emails a refund receipt.
 */
const refundBooking = async (
  bookingId: string,
  adminId: string
) => {
  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    include: {
      booking: {
        select: {
          id: true,
          customerId: true,
          trade: true,
          priceInPence: true,
          fullName: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment not found for this booking");
  }

  if (payment.status !== "PAID") {
    throw new AppError(
      400,
      `Only paid bookings can be refunded (current status: ${payment.status})`
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new AppError(400, "This payment has no Stripe PaymentIntent to refund");
  }

  try {
    await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      metadata: { bookingId, adminId },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe refund failed";
    throw new AppError(502, `Stripe refund failed: ${message}`);
  }

  const refunded = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED" },
  });

  // In-app + email to the customer.
  await notifyPaymentStatus(bookingId, "refunded");

  // Critical operational event -> all admins.
  void NotificationService.notifyAdmins({
    type: "PAYMENT_REFUNDED",
    title: "Refund issued",
    body: `${payment.booking.fullName} was refunded ${formatGBP(payment.amountInPence)} for their ${payment.booking.trade} booking.`,
    data: { bookingId },
  }).catch(() => undefined);

  return refunded;
};

/**
 * Stripe webhook
 */
const handleWebhookEvent = async (
  rawBody: Buffer,
  signature: string
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid webhook signature";

    throw new AppError(
      400,
      `Webhook signature verification failed: ${message}`
    );
  }

  console.log(
    `Stripe webhook received: ${event.type}`
  );

  switch (event.type) {
    /**
     * ============================================
     * CHECKOUT SESSION COMPLETED
     * ============================================
     */
     case "checkout.session.completed": {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const bookingId =
        session.metadata?.bookingId;

      console.log(
        "Checkout session:",
        session.id
      );

      console.log(
        "Booking ID:",
        bookingId
      );

      console.log(
        "Payment status:",
        session.payment_status
      );

      if (!bookingId) {
        console.warn(
          "Stripe checkout session has no bookingId metadata"
        );

        break;
      }

      /**
       * Only mark PAID when Stripe confirms paid.
       */
      if (session.payment_status !== "paid") {
        console.log(
          `Checkout completed but payment status is ${session.payment_status}`
        );

        break;
      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            bookingId,
          },
        });

      if (!payment) {
        console.warn(
          `Payment record not found for booking ${bookingId}`
        );

        break;
      }

      /**
       * Prevent:
       *
       * PAID -> PAID
       * REFUNDED -> PAID
       */
      if (
        payment.status === "PAID" ||
        payment.status === "REFUNDED"
      ) {
        break;
      }

      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "PAID",

          paidAt: new Date(),

          stripeSessionId: session.id,

          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : payment.stripePaymentIntentId,
        },
      });

      console.log(
        `Payment marked PAID for booking ${bookingId}`
      );

      void notifyPaymentStatus(bookingId, "success");

      break;
    }

    /**
     * ============================================
     * PAYMENT INTENT SUCCEEDED
     * ============================================
     */
    case "payment_intent.succeeded": {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      const bookingId =
        paymentIntent.metadata?.bookingId;

      console.log(
        "PaymentIntent succeeded:",
        paymentIntent.id
      );

      console.log(
        "Booking ID:",
        bookingId
      );

      if (!bookingId) {
        console.warn(
          "PaymentIntent has no bookingId metadata"
        );

        break;
      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            bookingId,
          },
        });

      if (!payment) {
        console.warn(
          `Payment record not found for booking ${bookingId}`
        );

        break;
      }

      if (
        payment.status === "PAID" ||
        payment.status === "REFUNDED"
      ) {
        break;
      }

      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "PAID",

          paidAt: new Date(),

          stripePaymentIntentId:
            paymentIntent.id,
        },
      });

      console.log(
        `PaymentIntent marked PAID for booking ${bookingId}`
      );

      void notifyPaymentStatus(bookingId, "success");

      break;
    }

    /**
     * ============================================
     * PAYMENT FAILED
     * ============================================
     */
    case "payment_intent.payment_failed": {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      const bookingId =
        paymentIntent.metadata?.bookingId;

      if (!bookingId) {
        break;
      }

      await markPaymentFailed(bookingId);

      console.log(
        `Payment marked FAILED for booking ${bookingId}`
      );

      void notifyPaymentStatus(bookingId, "failed");

      break;
    }

    /**
     * ============================================
     * ASYNC PAYMENT FAILED
     * ============================================
     */
    case "checkout.session.async_payment_failed": {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const bookingId =
        session.metadata?.bookingId;

      if (!bookingId) {
        break;
      }

      await markPaymentFailed(bookingId);

      void notifyPaymentStatus(bookingId, "failed");

      break;
    }

    /**
     * ============================================
     * CHECKOUT EXPIRED
     * ============================================
     */
    case "checkout.session.expired": {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const bookingId =
        session.metadata?.bookingId;

      if (!bookingId) {
        break;
      }

      await markPaymentFailed(bookingId);

      break;
    }

    /**
     * ============================================
     * REFUND
     * ============================================
     */
    case "charge.refunded": {
      const charge =
        event.data.object as Stripe.Charge;

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null;

      if (!paymentIntentId) {
        break;
      }

      await prisma.payment.updateMany({
        where: {
          stripePaymentIntentId:
            paymentIntentId,
        },

        data: {
          status: "REFUNDED",
        },
      });

      const refundedPayment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (refundedPayment) {
        void notifyPaymentStatus(refundedPayment.bookingId, "refunded");
      }

      break;
    }

    default:
      console.log(
        `Unhandled Stripe event: ${event.type}`
      );
  }

  return {
    received: true,
  };
};

export const PaymentService = {
  createCheckoutSession,
  getPaymentByBooking,
  getAllPayments,
  getPaymentStats,
  refundBooking,
  handleWebhookEvent,
};