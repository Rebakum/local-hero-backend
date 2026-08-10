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
