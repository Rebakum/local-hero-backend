import { z } from "zod";

const BOOKING_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

const createBookingValidation = z.object({
  body: z.object({
    trade: z.string().min(1, "Trade is required"),
    professionalId: z.string().uuid().optional(),
    postcode: z.string().min(1, "Postcode is required"),
    address: z.string().min(1, "Address is required"),
    bookingDate: z
      .string()
      .min(1, "Booking date is required")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid booking date"),
    timeSlot: z.string().min(1, "Time slot is required"),
    urgency: z
      .enum(["Standard", "Urgent (Same Day)", "Emergency 24/7 (45 Mins)"])
      .default("Standard"),
    description: z.string().min(1, "Description is required"),
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("A valid email is required"),
    phone: z.string().min(1, "Phone number is required"),
    notes: z.string().optional(),
  }),
});

const updateBookingStatusValidation = z.object({
  body: z.object({
    status: z.enum(BOOKING_STATUSES),
    priceInPence: z.number().int().positive().optional(),
    professionalId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

const assignProfessionalValidation = z.object({
  body: z.object({
    professionalId: z.string().uuid("Invalid professional ID"),
  }),
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

const getBookingValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

const getAllBookingsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().trim().optional(),
    trade: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
});

export type TCreateBookingPayload = z.infer<typeof createBookingValidation>["body"];
export type TUpdateBookingStatusPayload = z.infer<
  typeof updateBookingStatusValidation
>["body"];
export type TAssignProfessionalPayload = z.infer<
  typeof assignProfessionalValidation
>["body"];
export type TGetBookingsQuery = z.infer<typeof getAllBookingsQueryValidation>["query"];

export const BookingValidation = {
  createBookingValidation,
  updateBookingStatusValidation,
  assignProfessionalValidation,
  getBookingValidation,
  getAllBookingsQueryValidation,
};
