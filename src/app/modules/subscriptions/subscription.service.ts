import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import {
  TCreateSubscriptionPayload,
  TUpdateSubscriptionPayload,
} from "./subscription.validation";

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
} as const;

// Provider: my subscription.
const getMySubscription = async (userId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  const subscription = await prisma.providerSubscription.findUnique({
    where: { professionalId: professional.id },
    include: subscriptionInclude,
  });

  return subscription;
};

const create = async (data: TCreateSubscriptionPayload) => {
  const professional = await prisma.professional.findUnique({
    where: { id: data.professionalId },
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  return prisma.providerSubscription.upsert({
    where: { professionalId: data.professionalId },
    create: {
      professionalId: data.professionalId,
      plan: data.plan as never,
      priceInPence: data.priceInPence ?? 0,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      isFeatured: data.isFeatured ?? false,
      featureStartAt: data.featureStartAt ? new Date(data.featureStartAt) : undefined,
      featureEndAt: data.featureEndAt ? new Date(data.featureEndAt) : undefined,
    },
    update: {
      plan: data.plan as never,
      priceInPence: data.priceInPence ?? 0,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      isFeatured: data.isFeatured ?? false,
      featureStartAt: data.featureStartAt ? new Date(data.featureStartAt) : undefined,
      featureEndAt: data.featureEndAt ? new Date(data.featureEndAt) : undefined,
    },
    include: subscriptionInclude,
  });
};

const update = async (id: string, data: TUpdateSubscriptionPayload) => {
  const existing = await prisma.providerSubscription.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Subscription not found");
  }

  return prisma.providerSubscription.update({
    where: { id },
    data: {
      ...(data.plan !== undefined ? { plan: data.plan as never } : {}),
      ...(data.status !== undefined ? { status: data.status as never } : {}),
      ...(data.priceInPence !== undefined ? { priceInPence: data.priceInPence } : {}),
      ...(data.expiresAt !== undefined
        ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
        : {}),
      ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      ...(data.featureStartAt !== undefined
        ? { featureStartAt: data.featureStartAt ? new Date(data.featureStartAt) : null }
        : {}),
      ...(data.featureEndAt !== undefined
        ? { featureEndAt: data.featureEndAt ? new Date(data.featureEndAt) : null }
        : {}),
    },
    include: subscriptionInclude,
  });
};

const getAll = async (query: { page?: string; limit?: string; plan?: string; status?: string }) => {
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
};

export const SubscriptionService = {
  getMySubscription,
  create,
  update,
  getAll,
};
