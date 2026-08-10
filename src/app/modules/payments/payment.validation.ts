import { z } from "zod";

const createCheckoutSessionValidation = z.object({
  params: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});

const getPaymentValidation = z.object({
  params: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});

export const PaymentValidation = {
  createCheckoutSessionValidation,
  getPaymentValidation,
};
