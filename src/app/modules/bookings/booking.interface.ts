import { z } from "zod";

export interface IBooking {
  id: string;
  customerId: string;
  professionalId: string | null;
  trade: string;
  postcode: string;
  address: string;
  bookingDate: Date;
  timeSlot: string;
  urgency: string;
  description: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string | null;
  status: string;
  priceInPence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGetAllBookingsQuery {
  page?: string;
  limit?: string;
  status?: string;
  trade?: string;
  search?: string;
}

const BOOKING_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

export const CreateBookingValidation = z.object({
  body: z.object({
    trade: z.string().min(1, "Trade is required"),
    professionalId: z.string().uuid().optional(),
    postcode: z.string().min(1, "Postcode is required"),
    address: z.string().min(1, "Address is required"),
    // Accept a plain date string ("2026-08-20") or full ISO datetime.
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

export const UpdateBookingStatusValidation = z.object({
  body: z.object({
    status: z.enum(BOOKING_STATUSES),
    priceInPence: z.number().int().positive().optional(),
    professionalId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

export const AssignProfessionalValidation = z.object({
  body: z.object({
    professionalId: z.string().uuid("Invalid professional ID"),
  }),
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

export const GetBookingValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});
