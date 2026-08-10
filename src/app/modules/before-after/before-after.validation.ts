import { z } from "zod";

const createBeforeAfterValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    trade: z.string().min(1, "Trade is required"),
    location: z.string().min(1, "Location is required"),
    beforeImage: z
      .string()
      .url("Before image must be a valid URL")
      .nullable()
      .optional(),
    afterImage: z
      .string()
      .url("After image must be a valid URL")
      .nullable()
      .optional(),
    description: z.string().min(1, "Description is required"),
    cost: z.string().min(1, "Cost is required"),
    completionDays: z.string().min(1, "Completion days is required"),
    sortOrder: z.number().int().optional(),
  }),
});

const updateBeforeAfterValidation = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    beforeImage: z.string().url().nullable().optional(),
    afterImage: z.string().url().nullable().optional(),
    description: z.string().min(1).optional(),
    cost: z.string().min(1).optional(),
    completionDays: z.string().min(1).optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
  }),
});

const getBeforeAfterValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
  }),
});

const getAllBeforeAfterQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    trade: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
});

export type TCreateBeforeAfterPayload = z.infer<
  typeof createBeforeAfterValidation
>["body"];
export type TUpdateBeforeAfterPayload = z.infer<
  typeof updateBeforeAfterValidation
>["body"];
export type TGetBeforeAfterQuery = z.infer<
  typeof getAllBeforeAfterQueryValidation
>["query"];

export const BeforeAfterValidation = {
  createBeforeAfterValidation,
  updateBeforeAfterValidation,
  getBeforeAfterValidation,
  getAllBeforeAfterQueryValidation,
};
