import { z } from "zod";

export interface IProfession {
  id: string;
  tradeId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  trade?: {
    id: string;
    category: string;
  };
}

export interface IGetAllProfessionsQuery {
  page?: string;
  limit?: string;
  tradeId?: string;
  search?: string;
}

export const CreateProfessionValidation = z.object({
  body: z.object({
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    trade: z.string().min(1, "Trade category is required").optional(),
    name: z.string().min(1, "Name is required"),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const UpdateProfessionValidation = z.object({
  body: z.object({
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    trade: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid profession ID"),
  }),
});

export const GetProfessionValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid profession ID"),
  }),
});

export const GetAllProfessionsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    search: z.string().trim().optional(),
  }),
});
