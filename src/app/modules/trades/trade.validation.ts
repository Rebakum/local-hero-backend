import { z } from "zod";

const createTradeValidation = z.object({
  body: z.object({
    category: z.string().trim().min(1, "Category is required"),
    subtitle: z.string().trim().nullable().optional(),
    iconUrl: z.string().trim().nullable().optional(),
    description: z.string().trim().min(1, "Description is required"),
    avgHourlyRate: z.string().trim().min(1, "Average hourly rate is required"),
    startingPrice: z.string().trim().nullable().optional(),
    popularTasks: z
      .array(z.string().trim().min(1))
      .min(1, "At least one popular task is required"),
    badge: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateTradeValidation = z.object({
  body: z.object({
    category: z.string().trim().min(1, "Category is required").optional(),
    subtitle: z.string().trim().nullable().optional(),
    iconUrl: z.string().trim().nullable().optional(),
    description: z.string().trim().min(1, "Description is required").optional(),
    avgHourlyRate: z.string().trim().min(1, "Average hourly rate is required").optional(),
    startingPrice: z.string().trim().nullable().optional(),
    popularTasks: z.array(z.string().trim().min(1)).optional(),
    badge: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid trade ID"),
  }),
});

const getTradeValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid trade ID"),
  }),
});

const getAllTradesQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    sortBy: z
      .enum([
        "featured",
        "name-asc",
        "name-desc",
        "popular",
        "price-asc",
        "price-desc",
      ])
      .optional(),
  }),
});

export type TCreateTradePayload = z.infer<typeof createTradeValidation>["body"];
export type TUpdateTradePayload = z.infer<typeof updateTradeValidation>["body"];
export type TGetTradesQuery = z.infer<typeof getAllTradesQueryValidation>["query"];

export const TradeValidation = {
  createTradeValidation,
  updateTradeValidation,
  getTradeValidation,
  getAllTradesQueryValidation,
};
