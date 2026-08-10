import { z } from "zod";

export interface IFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllFAQsQuery {
  page?: string;
  limit?: string;
  category?: string;
  search?: string;
}

export const CreateFAQValidation = z.object({
  body: z.object({
    category: z.string().min(1, "Category is required"),
    question: z.string().min(1, "Question is required"),
    answer: z.string().min(1, "Answer is required"),
    sortOrder: z.number().int().optional(),
  }),
});

export const UpdateFAQValidation = z.object({
  body: z.object({
    category: z.string().min(1).optional(),
    question: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid FAQ ID"),
  }),
});

export const GetFAQValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid FAQ ID"),
  }),
});
