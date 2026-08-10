import Stripe from "stripe";
import prisma from "../../../config/prisma";
import stripe from "../../../config/stripe";
import config from "../../../config";
import AppError from "../../utils/AppError";

// Creates (or reuses) a Stripe Checkout Session so the customer can pay the
// quoted price for their booking. The booking must already have a price set
// by the professional/admin (via PATCH /bookings/:id/status) before a
// customer can pay for it.
const createCheckoutSession = async (bookingId: string, customerId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.customerId !== customerId) {
    throw new AppError(403, "You can only pay for your own booking");
  }

  if (!booking.priceInPence || booking.priceInPence <= 0) {
    throw new AppError(
      400,
      "This booking doesn't have a quoted price yet. Please wait for the professional to confirm a price first."
    );
  }

  if (booking.payment?.status === "PAID") {
    throw new AppError(400, "This booking has already been paid for");
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
            name: `LocalHero booking — ${booking.trade}`,
            description: `${booking.description}`.slice(0, 500),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking.id,
    },
    success_url: `${config.clientUrl}/dashboard/bookings?payment=success&bookingId=${booking.id}`,
    cancel_url: `${config.clientUrl}/dashboard/bookings?payment=cancelled&bookingId=${booking.id}`,
  });

  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: {
      amountInPence: booking.priceInPence,
      status: "PENDING",
      stripeSessionId: session.id,
    },
    create: {
      bookingId: booking.id,
      amountInPence: booking.priceInPence,
      currency: "gbp",
      status: "PENDING",
      stripeSessionId: session.id,
    },
  });

  return { checkoutUrl: session.url, payment };
};

const getPaymentByBooking = async (
  bookingId: string,
  requester: { userId: string; role: string }
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const isAdmin = requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";
  if (booking.customerId !== requester.userId && !isAdmin) {
    throw new AppError(403, "You are not allowed to view this payment");
  }

  return booking.payment;
};

// Handles the raw Stripe webhook event. Must be called with the *raw* request
// body (see payment.route.ts, which uses express.raw() only for this path)
// because Stripe signs the exact byte payload.
const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    throw new AppError(400, `Webhook signature verification failed: ${message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) break;

      await prisma.payment.updateMany({
        where: { bookingId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        },
      });

      // Payment confirmed -> move the job from "accepted/quoted" into
      // "in progress" so the provider knows they're clear to start work.
      await prisma.booking.updateMany({
        where: { id: bookingId, status: { in: ["PENDING", "ACCEPTED"] } },
        data: { status: "IN_PROGRESS" },
      });
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) break;

      await prisma.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }

    default:
      // Ignore event types we don't act on.
      break;
  }

  return { received: true };
};

export const PaymentService = {
  createCheckoutSession,
  getPaymentByBooking,
  handleWebhookEvent,
};
