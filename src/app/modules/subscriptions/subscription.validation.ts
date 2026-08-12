import { z } from "zod";

const PLANS = ["FREE", "PREMIUM", "FEATURED"] as const;
const STATUSES = ["ACTIVE", "EXPIRED", "CANCELLED"] as const;

const createSubscriptionValidation = z.object({
  body: z.object({
    professionalId: z.string().uuid("Invalid professional ID"),
    plan: z.enum(PLANS),
    priceInPence: z.number().int().min(0).optional(),
    expiresAt: z
      .string()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
    isFeatured: z.boolean().optional(),
    featureStartAt: z
      .string()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
    featureEndAt: z
      .string()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
  }),
});

const updateSubscriptionValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid subscription ID"),
  }),
  body: z.object({
    plan: z.enum(PLANS).optional(),
    status: z.enum(STATUSES).optional(),
    priceInPence: z.number().int().min(0).optional(),
    expiresAt: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
    isFeatured: z.boolean().optional(),
    featureStartAt: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
    featureEndAt: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Invalid date"),
  }),
});

const getSubscriptionValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid subscription ID"),
  }),
});

const listSubscriptionsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    plan: z.enum(PLANS).optional(),
    status: z.enum(STATUSES).optional(),
  }),
});

export type TCreateSubscriptionPayload = z.infer<
  typeof createSubscriptionValidation
>["body"];
export type TUpdateSubscriptionPayload = z.infer<
  typeof updateSubscriptionValidation
>["body"];

export const SubscriptionValidation = {
  createSubscriptionValidation,
  updateSubscriptionValidation,
  getSubscriptionValidation,
  listSubscriptionsQueryValidation,
};
