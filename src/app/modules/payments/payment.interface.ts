import { z } from "zod";

export interface IPayment {
  id: string;
  bookingId: string;
  amountInPence: number;
  currency: string;
  status: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateCheckoutSessionValidation = z.object({
  params: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});

export const GetPaymentValidation = z.object({
  params: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});
