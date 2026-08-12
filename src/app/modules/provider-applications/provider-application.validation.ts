import { z } from "zod";

const createProviderApplicationValidation = z.object({
  body: z.object({
    trade: z.string().min(1, "Trade is required"),
    companyName: z.string().min(1, "Company name is required"),
    companyLogo: z.string().nullable().optional(),
    bio: z.string().min(1, "Bio is required"),
    hourlyRate: z.number().int().min(1, "Hourly rate must be at least 1"),
    location: z.string().min(1, "Location is required"),
    postcodeArea: z.string().min(1, "Postcode area is required"),
    specialties: z
      .array(z.string())
      .min(1, "At least one specialty is required"),
    experienceYears: z
      .number()
      .int()
      .min(0, "Experience years must be non-negative"),
    phone: z.string().min(1, "Phone number is required"),
    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
    portfolioImages: z.array(z.string()).optional(),
  }),
});

const updateProviderApplicationValidation = z.object({
  body: z.object({
    trade: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    companyLogo: z.string().nullable().optional(),
    bio: z.string().min(1).optional(),
    hourlyRate: z.number().int().min(1).optional(),
    location: z.string().min(1).optional(),
    postcodeArea: z.string().min(1).optional(),
    specialties: z.array(z.string()).min(1).optional(),
    experienceYears: z.number().int().min(0).optional(),
    phone: z.string().min(1).optional(),
    avatar: z.string().url().nullable().optional(),
    portfolioImages: z.array(z.string()).optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

const getProviderApplicationValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

const approveProviderApplicationValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

const rejectProviderApplicationValidation = z.object({
  body: z.object({
    rejectionReason: z.string().min(1, "Rejection reason is required"),
  }),
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

const getAllProviderApplicationsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    trade: z.string().trim().optional(),
    status: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
});

export type TCreateProviderApplicationPayload = z.infer<
  typeof createProviderApplicationValidation
>["body"];
export type TUpdateProviderApplicationPayload = z.infer<
  typeof updateProviderApplicationValidation
>["body"];
export type TGetProviderApplicationsQuery = z.infer<
  typeof getAllProviderApplicationsQueryValidation
>["query"];

export const ProviderApplicationValidation = {
  createProviderApplicationValidation,
  updateProviderApplicationValidation,
  getProviderApplicationValidation,
  approveProviderApplicationValidation,
  rejectProviderApplicationValidation,
  getAllProviderApplicationsQueryValidation,
};
