import { z } from "zod";

export const GetProfessionalValidation = z.object({
  params: z.object({
    id: z.string({
      required_error: "Professional ID is required",
    }).min(1, "Invalid professional ID"),
  }),
});

export const UpdateProfessionalValidation = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    avatar: z.string().url().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().min(0).optional(),
    jobsCompleted: z.number().int().min(0).optional(),
    hourlyRate: z.number().int().min(0).optional(),
    location: z.string().min(1).optional(),
    postcodeArea: z.string().min(1).optional(),
    responseMinutes: z.number().int().min(0).optional(),
    verifiedStatus: z.record(z.unknown()).optional(),
    bio: z.string().min(1).optional(),
    specialties: z.array(z.string()).optional(),
    availability: z.string().optional(),
    portfolioImages: z.array(z.string()).optional(),
    badgeText: z.string().nullable().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().min(1, "Invalid professional ID"),
  }),
});