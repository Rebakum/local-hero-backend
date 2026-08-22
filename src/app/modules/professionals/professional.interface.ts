import { z } from "zod";

export interface IProfessional {
  id: string;
  userId: string | null;
  tradeId: string;
  professionId: string;
  name: string;
  trade: string;
  companyName: string;
  companyLogo: string | null;
  avatar: string | null;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  hourlyRate: number;
  location: string;
  postcodeArea: string;
  responseMinutes: number;
  verifiedStatus: Record<string, unknown>;
  bio: string;
  specialties: string[];
  availability: string;
  portfolioImages: string[];
  badgeText: string | null;
  isFeatured: boolean;
  sortOrder: number;
  workingHours: Record<string, unknown> | null;
  certifications: string[];
  insuranceInfo: string | null;
  serviceAreas: string[];
  yearsOfExperience: number | null;
  isVerified: boolean;
  isEmergency: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllProfessionalsQuery {
  page?: string;
  limit?: string;
  trade?: string;
  featured?: string;
  search?: string;
  location?: string;
  // --- Smart search filters ---
  rating?: string; // minimum rating (gte)
  minPrice?: string; // hourlyRate lower bound
  maxPrice?: string; // hourlyRate upper bound
  isVerified?: string; // "true" | "false"
  isEmergency?: string; // "true" | "false"
  availability?: string; // e.g. "Available Today"
  postcode?: string; // user postcode for local-area (distance) filtering
  distance?: string; // radius in miles (approximation via postcode area)
  sortBy?: string; // rating-desc | reviews-desc | name-asc | hourly-asc | hourly-desc | featured
}

export const CreateProfessionalValidation = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    trade: z.string().min(1, "Trade is required"),
    companyName: z.string().min(1, "Company name is required"),
    companyLogo: z.string().nullable().optional(),
    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().min(0).optional(),
    jobsCompleted: z.number().int().min(0).optional(),
    hourlyRate: z.number().int().min(0).optional(),
    location: z.string().min(1, "Location is required"),
    postcodeArea: z.string().min(1, "Postcode area is required"),
    responseMinutes: z.number().int().min(0).optional(),
    verifiedStatus: z.record(z.unknown()).optional(),
    bio: z.string().min(1, "Bio is required"),
    specialties: z.array(z.string()).optional(),
    availability: z.string().optional(),
    portfolioImages: z.array(z.string()).optional(),
    badgeText: z.string().nullable().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    userId: z.string().uuid("Invalid user ID").nullable().optional(),
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    professionId: z.string().uuid("Invalid profession ID").optional(),
    workingHours: z.record(z.unknown()).nullable().optional(),
    certifications: z.array(z.string()).optional(),
    insuranceInfo: z.string().nullable().optional(),
    serviceAreas: z.array(z.string()).optional(),
    yearsOfExperience: z.number().int().min(0).optional(),
    isVerified: z.boolean().optional(),
    isEmergency: z.boolean().optional(),
  }),
});

export const UpdateProfessionalValidation = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    trade: z.string().min(1).optional(),
    companyName: z.string().min(1).optional(),
    companyLogo: z.string().nullable().optional(),
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
    userId: z.string().uuid("Invalid user ID").nullable().optional(),
    tradeId: z.string().uuid("Invalid trade ID").optional(),
    professionId: z.string().uuid("Invalid profession ID").optional(),
    workingHours: z.record(z.unknown()).nullable().optional(),
    certifications: z.array(z.string()).optional(),
    insuranceInfo: z.string().nullable().optional(),
    serviceAreas: z.array(z.string()).optional(),
    yearsOfExperience: z.number().int().min(0).optional(),
    isVerified: z.boolean().optional(),
    isEmergency: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid professional ID"),
  }),
});

export const GetProfessionalValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid professional ID"),
  }),
});
