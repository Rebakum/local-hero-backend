import { z } from "zod";

const createTestimonialValidation = z.object({
  body: z.object({
    author: z.string().min(1, "Author is required"),
    role: z.string().min(1, "Role is required"),
    city: z.string().min(1, "City is required"),
    trade: z.string().min(1, "Trade is required"),
    rating: z.number().int().min(1).max(5).default(5),
    date: z.string().min(1, "Date is required"),
    comment: z.string().min(1, "Comment is required"),
    verifiedJob: z.string().min(1, "Verified job is required"),
    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
    photos: z.array(z.string().url("Photo must be a valid URL")).optional(),
    recommended: z.boolean().optional(),
    professionalId: z.string().uuid("Invalid professional ID").optional(),
    source: z.string().min(1, "Source is required"),
    sortOrder: z.number().int().optional(),
    bookingId: z.string().uuid("Invalid booking ID").optional(),
  }),
});

const updateTestimonialValidation = z.object({
  body: z.object({
    author: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    date: z.string().min(1).optional(),
    comment: z.string().min(1).optional(),
    verifiedJob: z.string().min(1).optional(),
    avatar: z.string().url().nullable().optional(),
    photos: z.array(z.string().url("Photo must be a valid URL")).optional(),
    recommended: z.boolean().optional(),
    professionalId: z.string().uuid("Invalid professional ID").optional(),
    source: z.string().min(1).optional(),
    sortOrder: z.number().int().optional(),
    isApproved: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    moderationNote: z.string().trim().max(1000).nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid testimonial ID"),
  }),
});

const respondToTestimonialValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid testimonial ID"),
  }),
  body: z.object({
    businessResponse: z.string().min(1, "Response is required").max(2000),
  }),
});

const getTestimonialValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid testimonial ID"),
  }),
});

const getAllTestimonialsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    trade: z.string().trim().optional(),
    search: z.string().trim().optional(),
    isApproved: z.enum(["true", "false"]).optional(),
    isFeatured: z.enum(["true", "false"]).optional(),
  }),
});

export type TCreateTestimonialPayload = z.infer<
  typeof createTestimonialValidation
>["body"];
export type TUpdateTestimonialPayload = z.infer<
  typeof updateTestimonialValidation
>["body"];
export type TGetTestimonialsQuery = z.infer<
  typeof getAllTestimonialsQueryValidation
>["query"];

export type TRespondToTestimonialPayload = z.infer<
  typeof respondToTestimonialValidation
>["body"];

export const TestimonialValidation = {
  createTestimonialValidation,
  updateTestimonialValidation,
  getTestimonialValidation,
  getAllTestimonialsQueryValidation,
  respondToTestimonialValidation,
};