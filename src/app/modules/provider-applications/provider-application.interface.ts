import { z } from "zod";

export interface IProviderApplication {
  id: string;
  userId: string;
  trade: string;
  companyName: string;
  bio: string;
  hourlyRate: number;
  location: string;
  postcodeArea: string;
  specialties: string[];
  experienceYears: number;
  phone: string;
  avatar: string | null;
  portfolioImages: string[];
  status: string;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllProviderApplicationsQuery {
  page?: string;
  limit?: string;
  trade?: string;
  status?: string;
  search?: string;
}

export const CreateProviderApplicationValidation = z.object({
  body: z.object({
    trade: z.string().min(1, "Trade is required"),
    companyName: z.string().min(1, "Company name is required"),
    bio: z.string().min(1, "Bio is required"),
    hourlyRate: z.number().int().min(1, "Hourly rate must be at least 1"),
    location: z.string().min(1, "Location is required"),
    postcodeArea: z.string().min(1, "Postcode area is required"),
    specialties: z.array(z.string()).min(1, "At least one specialty is required"),
    experienceYears: z.number().int().min(0, "Experience years must be non-negative"),
    phone: z.string().min(1, "Phone number is required"),
    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
    portfolioImages: z.array(z.string()).optional(),
  }),
});

export const UpdateProviderApplicationValidation = z.object({
  body: z.object({
    trade: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
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

export const GetProviderApplicationValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

export const ApproveProviderApplicationValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});

export const RejectProviderApplicationValidation = z.object({
  body: z.object({
    rejectionReason: z.string().min(1, "Rejection reason is required"),
  }),
  params: z.object({
    id: z.string().uuid("Invalid provider application ID"),
  }),
});
