import { z } from "zod";

const updateProfileValidation = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters")
      .optional(),
    phone: z.string().optional(),
    avatar: z.string().url("Avatar must be a valid URL").optional(),
  }),
});

const applyProviderValidation = z.object({
  body: z.object({
    category: z.string().min(1, "Category is required"),
    experienceYears: z
      .number()
      .int()
      .min(0, "Experience years must be non-negative"),
    serviceDetails: z.string().min(1, "Service details are required"),
    phone: z.string().min(1, "Phone number is required"),
  }),
});

const deleteProfileValidation = z.object({
  body: z.object({
    password: z.string().min(1, "Password is required for account deletion"),
  }),
});

export const UserValidation = {
  updateProfileValidation,
  applyProviderValidation,
  deleteProfileValidation,
};
