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