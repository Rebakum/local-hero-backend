import { z } from "zod";

const createFaqValidation = z.object({
  body: z.object({
    question: z.string().min(1, "Question is required").max(500),
    answer: z.string().min(1, "Answer is required").max(5000),
    category: z.string().trim().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFaqValidation = z.object({
  body: z.object({
    question: z.string().min(1).max(500).optional(),
    answer: z.string().min(1).max(5000).optional(),
    category: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid FAQ ID"),
  }),
});

const getFaqValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid FAQ ID"),
  }),
});

const getAllFaqsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    category: z.string().trim().optional(),
    search: z.string().trim().optional(),
    isActive: z.enum(["true", "false"]).optional(),
  }),
});

export type TCreateFaqPayload = z.infer<
  typeof createFaqValidation
>["body"];
export type TUpdateFaqPayload = z.infer<
  typeof updateFaqValidation
>["body"];
export type TGetFaqsQuery = z.infer<
  typeof getAllFaqsQueryValidation
>["query"];

export const FaqValidation = {
  createFaqValidation,
  updateFaqValidation,
  getFaqValidation,
  getAllFaqsQueryValidation,
};