import { z } from "zod";

export interface ITestimonial {
  id: string;
  author: string;
  role: string;
  city: string;
  trade: string;
  rating: number;
  date: string;
  comment: string;
  verifiedJob: string;
  avatar: string | null;
  source: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllTestimonialsQuery {
  page?: string;
  limit?: string;
  trade?: string;
  search?: string;
}

export const CreateTestimonialValidation = z.object({
  body: z.object({
    author: z.string().min(1, "Author is required"),
    role: z.string().min(1, "Role is required"),
    city: z.string().min(1, "City is required"),
    trade: z.string().min(1, "Trade is required"),
    rating: z.number().int().min(1).max(5).optional(),
    date: z.string().min(1, "Date is required"),
    comment: z.string().min(1, "Comment is required"),
    verifiedJob: z.string().min(1, "Verified job is required"),
    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
    source: z.string().min(1, "Source is required"),
    sortOrder: z.number().int().optional(),
  }),
});

export const UpdateTestimonialValidation = z.object({
  body: z.object({
    author: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    date: z.string().min(1).optional(),
    comment: z.string().min(1).optional(),
    verifiedJob: z.string().min(1).optional(),
    avatar: z.string().url().optional(),
    source: z.string().min(1).optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid testimonial ID"),
  }),
});

export const GetTestimonialValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid testimonial ID"),
  }),
});
