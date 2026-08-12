export interface IQuote {
  id: string;
  customerId: string;
  trade: string;
  postcode: string;
  city: string;
  description: string;
  budgetInPence: number | null;
  preferredDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuoteResponse {
  id: string;
  quoteId: string;
  professionalId: string;
  amountInPence: number;
  message: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
