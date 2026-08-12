import { z } from "zod";

const createQuoteValidation = z.object({
  body: z.object({
    trade: z.string().min(1, "Trade is required"),
    professionId: z.string().uuid("Invalid profession ID").optional(),
    postcode: z.string().min(1, "Postcode is required"),
    city: z.string().min(1, "City is required"),
    description: z.string().min(1, "Description is required"),
    budgetInPence: z.number().int().positive().optional(),
    preferredDate: z
      .string()
      .optional()
      .refine(
        (val) => !val || !Number.isNaN(Date.parse(val)),
        "Invalid preferred date"
      ),
  }),
});

const respondToQuoteValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid quote ID"),
  }),
  body: z.object({
    amountInPence: z.number().int().positive("Amount must be a positive number"),
    message: z.string().max(2000, "Message is too long").optional(),
  }),
});

const updateQuoteResponseStatusValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid quote ID"),
    responseId: z.string().uuid("Invalid response ID"),
  }),
  body: z.object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
  }),
});

const getQuoteValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid quote ID"),
  }),
});

const listQuotesQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    trade: z.string().trim().optional(),
    status: z.string().trim().optional(),
  }),
});

export type TCreateQuotePayload = z.infer<typeof createQuoteValidation>["body"];
export type TRespondToQuotePayload = z.infer<typeof respondToQuoteValidation>["body"];
export type TUpdateQuoteResponseStatusPayload = z.infer<
  typeof updateQuoteResponseStatusValidation
>["body"];
export type TListQuotesQuery = z.infer<typeof listQuotesQueryValidation>["query"];

export const QuoteValidation = {
  createQuoteValidation,
  respondToQuoteValidation,
  updateQuoteResponseStatusValidation,
  getQuoteValidation,
  listQuotesQueryValidation,
};
