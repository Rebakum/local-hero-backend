import { z } from "zod";

export interface IBeforeAfterProject {
  id: string;
  title: string;
  trade: string;
  location: string;
  beforeImage: string | null;
  afterImage: string | null;
  description: string;
  cost: string;
  completionDays: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllBeforeAfterQuery {
  page?: string;
  limit?: string;
  trade?: string;
  search?: string;
}

export const CreateBeforeAfterValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    trade: z.string().min(1, "Trade is required"),
    location: z.string().min(1, "Location is required"),
    beforeImage: z.string().url("Before image must be a valid URL").nullable().optional(),
    afterImage: z.string().url("After image must be a valid URL").nullable().optional(),
    description: z.string().min(1, "Description is required"),
    cost: z.string().min(1, "Cost is required"),
    completionDays: z.string().min(1, "Completion days is required"),
    sortOrder: z.number().int().optional(),
  }),
});

export const UpdateBeforeAfterValidation = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    beforeImage: z.string().url().optional(),
    afterImage: z.string().url().optional(),
    description: z.string().min(1).optional(),
    cost: z.string().min(1).optional(),
    completionDays: z.string().min(1).optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
  }),
});

export const GetBeforeAfterValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid before/after project ID"),
  }),
});
