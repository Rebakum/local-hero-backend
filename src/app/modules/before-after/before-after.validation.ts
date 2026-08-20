import { z } from "zod";

const createBeforeAfterValidation = z.object({
  body: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
    beforeImage: z.string().url("Before image must be a valid URL"),
    afterImage: z.string().url("After image must be a valid URL"),
    description: z.string().min(1, "Description is required"),
    cost: z.string().min(1, "Cost is required"),
    completionDays: z.string().min(1, "Completion days is required"),
  }),
});

const updateBeforeAfterValidation = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    beforeImage: z.string().url("Before image must be a valid URL").optional(),
    afterImage: z.string().url("After image must be a valid URL").optional(),
    description: z.string().min(1).optional(),
    cost: z.string().min(1).optional(),
    completionDays: z.string().min(1).optional(),
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
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]).optional(),
    isFeatured: z.string().optional(),
    professionalId: z.string().optional(),
  }),
});

const updateStatusValidation = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().trim().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
  }),
});

const toggleFeatureValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
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
  updateStatusValidation,
  toggleFeatureValidation,
};
