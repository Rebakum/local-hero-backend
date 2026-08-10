import { z } from "zod";

// Featured Service Child Schema for Strict Type Safety
const featuredServiceSchema = z.object({
  title: z.string().min(1, "Service title is required"),
  image: z.string().url("Invalid image URL").or(z.string().min(1)),
  description: z.string().optional(),
  estimatedPrice: z.string().optional(),
  timeEstimate: z.string().optional(),
  popularFor: z.array(z.string()).optional(),
  included: z.array(z.string()).optional(),
  isEmergency: z.boolean().optional(),
});

const createTradeValidation = z.object({
  body: z.object({
    category: z.string().min(1, "Category is required"),
    subtitle: z.string().optional(),
    iconName: z.string().min(1, "Icon name is required"),
    description: z.string().min(1, "Description is required"),
    avgHourlyRate: z.string().min(1, "Average hourly rate is required"),
    activeProsCount: z.number().int().min(0).optional(),
    popularTasks: z.array(z.string()).optional(),
    badge: z.string().nullable().optional(),
    featuredService: featuredServiceSchema, // Strongly Typed Validation
    sortOrder: z.number().int().optional(),
  }),
});

const updateTradeValidation = z.object({
  body: z.object({
    category: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    iconName: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    avgHourlyRate: z.string().min(1).optional(),
    activeProsCount: z.number().int().min(0).optional(),
    popularTasks: z.array(z.string()).optional(),
    badge: z.string().nullable().optional(),
    featuredService: featuredServiceSchema.partial().optional(), // Optional fields inside updating
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid trade ID"), // MongoDB হলে z.string().min(1) বা regex ব্যবহার করুন
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
    sortBy: z.string().trim().optional(),
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