import { z } from "zod";

const createFeaturedServiceValidation = z.object({
  body: z.object({
    tradeId: z.string().uuid("Valid trade ID is required"),
    title: z.string().trim().min(1, "Service title is required"),
    estimatedPrice: z.string().trim().nullable().optional(),
    timeEstimate: z.string().trim().nullable().optional(),
    popularFor: z.array(z.string().trim().min(1)).optional(),
    description: z.string().trim().min(1, "Service description is required"),
    imageUrl: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFeaturedServiceValidation = z.object({
  body: z.object({
    tradeId: z.string().uuid("Valid trade ID is required").optional(),
    title: z.string().trim().min(1, "Service title is required").optional(),
    estimatedPrice: z.string().trim().nullable().optional(),
    timeEstimate: z.string().trim().nullable().optional(),
    popularFor: z.array(z.string().trim().min(1)).optional(),
    description: z.string().trim().min(1, "Service description is required").optional(),
    imageUrl: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid featured service ID"),
  }),
});

const getFeaturedServiceValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid featured service ID"),
  }),
});

const getAllFeaturedServicesQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    search: z.string().trim().optional(),
    isActive: z.string().optional(),
  }),
});

export type TCreateFeaturedServicePayload = z.infer<
  typeof createFeaturedServiceValidation
>["body"];
export type TUpdateFeaturedServicePayload = z.infer<
  typeof updateFeaturedServiceValidation
>["body"];
export type TGetFeaturedServicesQuery = z.infer<
  typeof getAllFeaturedServicesQueryValidation
>["query"];

export const FeaturedServiceValidation = {
  createFeaturedServiceValidation,
  updateFeaturedServiceValidation,
  getFeaturedServiceValidation,
  getAllFeaturedServicesQueryValidation,
};
