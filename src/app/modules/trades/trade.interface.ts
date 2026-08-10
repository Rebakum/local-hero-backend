import { z } from "zod";

export interface ITrade {
  id: string;
  category: string;
  subtitle: string | null;
  iconName: string;
  description: string;
  avgHourlyRate: string;
  activeProsCount: number;
  popularTasks: string[];
  badge: string | null;
  featuredService: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllTradesQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export const CreateTradeValidation = z.object({
  body: z.object({
    category: z.string().min(1, "Category is required"),
    subtitle: z.string().optional(),
    iconName: z.string().min(1, "Icon name is required"),
    description: z.string().min(1, "Description is required"),
    avgHourlyRate: z.string().min(1, "Average hourly rate is required"),
    activeProsCount: z.number().int().min(0).optional(),
    popularTasks: z.array(z.string()).optional(),
    badge: z.string().nullable().optional(),
    featuredService: z.record(z.unknown()),
    sortOrder: z.number().int().optional(),
  }),
});

export const UpdateTradeValidation = z.object({
  body: z.object({
    category: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    iconName: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    avgHourlyRate: z.string().min(1).optional(),
    activeProsCount: z.number().int().min(0).optional(),
    popularTasks: z.array(z.string()).optional(),
    badge: z.string().nullable().optional(),
    featuredService: z.record(z.unknown()).optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid trade ID"),
  }),
});

export const GetTradeValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid trade ID"),
  }),
});
