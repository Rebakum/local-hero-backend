import Stripe from "stripe";
import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import stripe from "../../../config/stripe";
import config from "../../../config";
import { NotificationService } from "../notifications/notification.service";
import { sendTransactionalEmail } from "../../utils/email";
import { ProviderPlan, SubscriptionStatus } from "@prisma/client";

const subscriptionInclude = {
  professional: {
    select: {
      id: true,
      name: true,
      companyName: true,
      trade: true,
      avatar: true,
      isVerified: true,
    },
  },
  planDetail: true,
} as const;

// ---- helpers ---------------------------------------------------------------

const getProfessionalForUser = async (userId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { userId },
  });

  if (!professional) {
    throw new AppError(
      403,
      "You need an approved professional profile to manage a subscription"
    );
  }

  return professional;
};

// Never leak Stripe identifiers or anything sensitive to the client.
const safeSubscription = (sub: any) => {
  if (!sub) return null;
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stripeCustomerId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stripeSubscriptionId,
    ...rest
  } = sub;
  return rest;
};

const mapSlugToLegacyPlan = (slug?: string | null): ProviderPlan =>
  slug === "free" ? "FREE" : "PREMIUM";

// Create (and cache) the recurring Stripe Price for a plan on first use so the
// subscription flow works without requiring pre-configured Stripe prices.
const getOrCreateSubscriptionPrice = async (plan: {
  id: string;
  name: string;
  priceInPence: number;
  interval: string;
  stripePriceId: string | null;
}) => {
  if (plan.stripePriceId) return plan.stripePriceId;

  const price = await stripe.prices.create({
    currency: "gbp",
    unit_amount: plan.priceInPence,
    recurring: { interval: plan.interval === "YEARLY" ? "year" : "month" },
    product_data: { name: `LocalHero ${plan.name}` },
    metadata: { planId: plan.id },
  });

  await prisma.subscriptionPlan.update({
    where: { id: plan.id },
    data: { stripePriceId: price.id },
  });

  return price.id;
};

// Create a one-time Stripe Price for a Featured add-on purchase.
const createOneTimePrice = async (
  name: string,
  priceInPence: number,
  metadata: Record<string, string>
) =>
  stripe.prices.create({
    currency: "gbp",
    unit_amount: priceInPence,
    product_data: { name },
    metadata,
  });

const mapStripeStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "EXPIRED";
    case "canceled":
      return "CANCELLED";
    default:
      return "EXPIRED";
  }
};

const notifyProfessional = async (
  professionalId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { userId: true },
  });
  if (!professional?.userId) return;
  void NotificationService.create({
    userId: professional.userId,
    type,
    title,
    body,
    data,
  }).catch(() => undefined);
};

// ---- plans -----------------------------------------------------------------

const getPlans = async () => {
  return prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
};

// ---- current subscription --------------------------------------------------

const getMySubscription = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
    include: subscriptionInclude,
  });

  return safeSubscription(subscription);
};

// ---- checkout --------------------------------------------------------------

const createCheckout = async (userId: string, planId: string) => {
  const professional = await getProfessionalForUser(userId);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.active) {
    throw new AppError(404, "Plan not found or inactive");
  }

  if (plan.priceInPence <= 0) {
    throw new AppError(
      400,
      "This plan is free and does not require checkout. Choose a paid plan to continue."
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  // Get or create the Stripe customer (idempotent per professional).
  let subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name || professional.name,
      metadata: { professionalId: professional.id, userId },
    });
    customerId = customer.id;
  }

  // Create/cache the recurring Stripe price for this plan.
  const priceId = await getOrCreateSubscriptionPrice(plan);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { professionalId: professional.id, userId, planId },
    },
    metadata: { professionalId: professional.id, userId, planId },
    success_url: `${config.clientUrl}/dashboard/provider/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.clientUrl}/dashboard/provider/subscription/cancel`,
  });

  // Persist/refresh the local subscription record (status INCOMPLETE until
  // the webhook confirms it). The webhook is the source of truth.
  await prisma.providerSubscription.upsert({
    where: { professionalId: professional.id },
    create: {
      professionalId: professional.id,
      planId: plan.id,
      plan: mapSlugToLegacyPlan(plan.slug),
      priceInPence: plan.priceInPence,
      status: "INCOMPLETE",
      stripeCustomerId: customerId,
    },
    update: {
      planId: plan.id,
      plan: mapSlugToLegacyPlan(plan.slug),
      priceInPence: plan.priceInPence,
      stripeCustomerId: customerId,
    },
  });

  return { url: session.url, sessionId: session.id };
};

// ---- change plan -----------------------------------------------------------

const changePlan = async (userId: string, planId: string) => {
  const professional = await getProfessionalForUser(userId);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.active) {
    throw new AppError(404, "Plan not found or inactive");
  }

  if (plan.priceInPence <= 0 || !plan.stripePriceId) {
    throw new AppError(
      400,
      "This plan is not available for online payment. Free plans are handled separately."
    );
  }

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new AppError(400, "No active Stripe subscription to change");
  }

  if (!["ACTIVE", "TRIALING", "PAST_DUE"].includes(subscription.status)) {
    throw new AppError(400, "Your subscription is not active");
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  );

  const itemId = stripeSubscription.items.data[0]?.id;
  if (!itemId) {
    throw new AppError(400, "Stripe subscription has no items to update");
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [{ id: itemId, price: plan.stripePriceId }],
    proration_behavior: "create_prorations",
    metadata: { professionalId: professional.id, planId },
  });

  // Optimistic local update; the webhook remains the source of truth.
  await prisma.providerSubscription.update({
    where: { professionalId: professional.id },
    data: {
      planId: plan.id,
      plan: mapSlugToLegacyPlan(plan.slug),
      priceInPence: plan.priceInPence,
    },
  });

  return { message: "Plan change submitted. Confirming with Stripe..." };
};

// ---- cancel ----------------------------------------------------------------

const cancel = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new AppError(400, "No Stripe subscription to cancel");
  }

  if (subscription.cancelAtPeriodEnd) {
    throw new AppError(
      400,
      "Your subscription is already set to cancel at the end of the billing period"
    );
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.providerSubscription.update({
    where: { professionalId: professional.id },
    data: { cancelAtPeriodEnd: true },
  });

  void notifyProfessional(
    professional.id,
    "GENERAL",
    "Subscription cancellation scheduled",
    "Your subscription will remain active until the end of your current billing period, then cancel.",
    { professionalId: professional.id }
  );

  return {
    message: "Your subscription will end at the end of the current billing period",
  };
};

// ---- resume ----------------------------------------------------------------

const resume = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new AppError(400, "No Stripe subscription to resume");
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new AppError(400, "Your subscription is not scheduled to cancel");
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.providerSubscription.update({
    where: { professionalId: professional.id },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });

  return { message: "Your subscription has been resumed" };
};

// ---- billing portal --------------------------------------------------------

const billingPortal = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  if (!subscription?.stripeCustomerId) {
    throw new AppError(400, "No billing profile found for this account");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${config.clientUrl}/dashboard/provider/subscription`,
  });

  return { url: session.url };
};

// ---- entitlement -----------------------------------------------------------

const getProfessionalSubscription = async (professionalId: string) => {
  return prisma.providerSubscription.findUnique({
    where: { professionalId },
    include: { planDetail: true },
  });
};

const requireActiveSubscription = async (professionalId: string) => {
  const subscription = await getProfessionalSubscription(professionalId);
  const active = !!subscription && ["ACTIVE", "TRIALING"].includes(subscription.status);
  return { active, subscription };
};

// ---- Featured add-on -------------------------------------------------------

const getFeaturedAddons = async () => {
  return prisma.featuredAddon.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
};

// Whether the professional currently has an active Featured placement.
const getActiveFeature = async (professionalId: string) => {
  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId },
    select: { isFeatured: true, featureStartAt: true, featureEndAt: true },
  });
  if (!subscription?.isFeatured || !subscription.featureEndAt) return null;
  if (new Date(subscription.featureEndAt) < new Date()) return null;
  return subscription;
};

// One-time "Featured Business" purchase (7/30/90 days) via Stripe payment mode.
const createFeatureCheckout = async (userId: string, addonId: string) => {
  const professional = await getProfessionalForUser(userId);

  const addon = await prisma.featuredAddon.findUnique({
    where: { id: addonId },
  });

  if (!addon || !addon.active) {
    throw new AppError(404, "Featured add-on not found or inactive");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  let subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
  });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name || professional.name,
      metadata: { professionalId: professional.id, userId },
    });
    customerId = customer.id;
  }

  const price = await createOneTimePrice(
    `LocalHero Featured Business (${addon.durationDays} days)`,
    addon.priceInPence,
    { professionalId: professional.id, addonId: addon.id }
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      professionalId: professional.id,
      userId,
      type: "feature",
      addonId: addon.id,
      durationDays: String(addon.durationDays),
    },
    success_url: `${config.clientUrl}/dashboard/provider/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.clientUrl}/dashboard/provider/subscription/cancel`,
  });

  return { url: session.url, sessionId: session.id };
};

// Applied from the webhook when a one-time feature checkout completes. Extends
// any existing active feature period rather than overwriting it.
const applyFeaturePurchase = async (session: any) => {
  const professionalId = session.metadata?.professionalId;
  if (!professionalId) return null;

  const durationDays = parseInt(session.metadata?.durationDays || "0", 10);
  if (!durationDays) return null;

  const now = new Date();

  const existing = await prisma.providerSubscription.findUnique({
    where: { professionalId },
    select: { featureStartAt: true, featureEndAt: true },
  });

  // If there's a still-active feature period, extend from its end date;
  // otherwise start from now.
  const base =
    existing?.featureEndAt && new Date(existing.featureEndAt) > now
      ? new Date(existing.featureEndAt)
      : now;

  const featureStartAt = new Date(base);
  const featureEndAt = new Date(base);
  featureEndAt.setDate(featureEndAt.getDate() + durationDays);

  return prisma.providerSubscription.upsert({
    where: { professionalId },
    create: {
      professionalId,
      plan: "FREE" as ProviderPlan,
      status: "ACTIVE" as never,
      isFeatured: true,
      featureStartAt,
      featureEndAt,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? undefined,
    },
    update: {
      isFeatured: true,
      featureStartAt,
      featureEndAt,
      ...(session.customer
        ? {
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? undefined,
          }
        : {}),
    },
  });
};

// ---- Stripe webhook sync ---------------------------------------------------

const syncFromStripeSubscription = async (
  stripeSubscription: Stripe.Subscription
) => {
  const professionalId =
    stripeSubscription.metadata?.professionalId ?? null;

  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id ?? null;

  const priceId = stripeSubscription.items.data[0]?.price?.id ?? null;
  const plan = priceId
    ? await prisma.subscriptionPlan.findFirst({
        where: { stripePriceId: priceId },
      })
    : null;

  const status = mapStripeStatus(stripeSubscription.status);

  const data = {
    planId: plan?.id ?? undefined,
    plan: plan ? mapSlugToLegacyPlan(plan.slug) : undefined,
    status: status as never,
    priceInPence: plan?.priceInPence ?? undefined,
    stripeSubscriptionId: stripeSubscription.id,
    currentPeriodStart: stripeSubscription.current_period_start
      ? new Date(stripeSubscription.current_period_start * 1000)
      : undefined,
    currentPeriodEnd: stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : undefined,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null,
    expiresAt:
      stripeSubscription.cancel_at_period_end &&
      stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
  };

  const createData = {
    professionalId,
    planId: plan?.id ?? undefined,
    plan: plan ? mapSlugToLegacyPlan(plan.slug) : ("FREE" as ProviderPlan),
    status: status as never,
    priceInPence: plan?.priceInPence ?? 0,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
    currentPeriodStart: data.currentPeriodStart as Date | undefined,
    currentPeriodEnd: data.currentPeriodEnd as Date | undefined,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: data.canceledAt as Date | null | undefined,
  };

  // Capture the previous state so we only notify/email on real transitions
  // (not on every idempotent webhook replay).
  let previous: any = null;
  if (professionalId) {
    previous = await prisma.providerSubscription.findUnique({
      where: { professionalId },
    });
  } else {
    previous =
      (await prisma.providerSubscription.findUnique({
        where: { stripeSubscriptionId: stripeSubscription.id },
      })) ||
      (customerId
        ? await prisma.providerSubscription.findFirst({
            where: { stripeCustomerId: customerId },
          })
        : null);
  }

  let synced: any = null;

  if (professionalId) {
    synced = await prisma.providerSubscription.upsert({
      where: { professionalId },
      create: createData,
      update: data,
      include: subscriptionInclude,
    });
  } else {
    const bySub = await prisma.providerSubscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });
    if (bySub) {
      synced = await prisma.providerSubscription.update({
        where: { id: bySub.id },
        data,
        include: subscriptionInclude,
      });
    } else if (customerId) {
      const byCust = await prisma.providerSubscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (byCust) {
        synced = await prisma.providerSubscription.update({
          where: { id: byCust.id },
          data: { ...data, stripeSubscriptionId: stripeSubscription.id },
          include: subscriptionInclude,
        });
      }
    }
  }

  // Fire notifications/emails for meaningful transitions only.
  if (synced) {
    const profId = String(professionalId || synced?.professionalId);
    const prevStatus = previous?.status;
    const prevCancel = previous?.cancelAtPeriodEnd;

    const notifyAndEmail = async (
      title: string,
      body: string,
      emailType:
        | "SUBSCRIPTION_ACTIVATED"
        | "SUBSCRIPTION_PAYMENT_FAILED"
        | "SUBSCRIPTION_CANCELLED"
        | "SUBSCRIPTION_ENDING",
      emailData: Record<string, unknown> = {}
    ) => {
      void notifyProfessional(
        profId,
        "GENERAL",
        title,
        body,
        { professionalId: profId }
      ).catch(() => undefined);

      const prof = await prisma.professional.findUnique({
        where: { id: profId },
        select: { userId: true },
      });
      if (prof?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: prof.userId },
          select: { email: true, name: true },
        });
        if (user?.email) {
          void sendTransactionalEmail(emailType, user.email, {
            ...emailData,
            name: user.name,
            planName: (synced as any)?.planDetail?.name || "LocalHero",
          });
        }
      }
    };

    const becameActive = status === "ACTIVE" && prevStatus !== "ACTIVE";
    const becamePastDue = status === "PAST_DUE" && prevStatus !== "PAST_DUE";
    const becameCancelled = status === "CANCELLED" && prevStatus !== "CANCELLED";
    const newlyEnding =
      status === "ACTIVE" &&
      stripeSubscription.cancel_at_period_end &&
      prevCancel === false;

    if (newlyEnding) {
      const endDate = synced.currentPeriodEnd
        ? new Date(synced.currentPeriodEnd).toLocaleDateString("en-GB")
        : undefined;
      void notifyAndEmail(
        "Subscription ending soon",
        `Your subscription will end on ${endDate ?? "the end of this billing period"}.`,
        "SUBSCRIPTION_ENDING",
        { endDate }
      );
    } else if (becameActive) {
      void notifyAndEmail(
        "Subscription activated",
        "Your paid subscription is now active.",
        "SUBSCRIPTION_ACTIVATED"
      );
    } else if (becamePastDue) {
      void notifyAndEmail(
        "Payment needs attention",
        "We couldn't process your subscription payment. Please update your payment method.",
        "SUBSCRIPTION_PAYMENT_FAILED"
      );
    } else if (becameCancelled) {
      void notifyAndEmail(
        "Subscription cancelled",
        "Your subscription is no longer active.",
        "SUBSCRIPTION_CANCELLED"
      );
    }
  }

  return synced;
};

export const SubscriptionService = {
  getPlans,
  getMySubscription,
  createCheckout,
  createFeatureCheckout,
  getFeaturedAddons,
  applyFeaturePurchase,
  getActiveFeature,
  changePlan,
  cancel,
  resume,
  billingPortal,
  getProfessionalSubscription,
  requireActiveSubscription,
  syncFromStripeSubscription,
  // Legacy admin-managed helpers kept for backward compatibility.
  create: async (data: any) => {
    const professional = await prisma.professional.findUnique({
      where: { id: data.professionalId },
    });
    if (!professional) throw new AppError(404, "Professional not found");
    return prisma.providerSubscription.upsert({
      where: { professionalId: data.professionalId },
      create: {
        professionalId: data.professionalId,
        plan: data.plan as ProviderPlan,
        priceInPence: data.priceInPence ?? 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isFeatured: data.isFeatured ?? false,
        featureStartAt: data.featureStartAt ? new Date(data.featureStartAt) : undefined,
        featureEndAt: data.featureEndAt ? new Date(data.featureEndAt) : undefined,
      },
      update: {
        plan: data.plan as ProviderPlan,
        priceInPence: data.priceInPence ?? 0,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isFeatured: data.isFeatured ?? false,
        featureStartAt: data.featureStartAt ? new Date(data.featureStartAt) : undefined,
        featureEndAt: data.featureEndAt ? new Date(data.featureEndAt) : undefined,
      },
      include: subscriptionInclude,
    });
  },
  update: async (id: string, data: any) => {
    const existing = await prisma.providerSubscription.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Subscription not found");
    return prisma.providerSubscription.update({
      where: { id },
      data: {
        ...(data.plan !== undefined ? { plan: data.plan as ProviderPlan } : {}),
        ...(data.status !== undefined ? { status: data.status as never } : {}),
        ...(data.priceInPence !== undefined ? { priceInPence: data.priceInPence } : {}),
        ...(data.expiresAt !== undefined
          ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
          : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      },
      include: subscriptionInclude,
    });
  },
  getAll: async (query: any) => {
    const page = Math.max(parseInt(query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || "10", 10), 1), 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (query.plan) where.plan = query.plan;
    if (query.status) where.status = query.status;
    const [subscriptions, total] = await Promise.all([
      prisma.providerSubscription.findMany({
        where,
        skip,
        take: limit,
        include: subscriptionInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.providerSubscription.count({ where }),
    ]);
    return {
      subscriptions,
      meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    };
  },
};
