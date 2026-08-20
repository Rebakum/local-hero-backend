import { z } from "zod";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const createTicketValidation = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required").optional(),
    email: z
      .string()
      .trim()
      .email("A valid email is required")
      .optional(),
    phone: z.string().trim().optional(),
    subject: z.string().trim().min(1, "Subject is required"),
    message: z.string().trim().min(1, "Message is required"),
  }),
});

const listTicketsQueryValidation = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(TICKET_STATUSES).optional(),
  }),
});

const updateTicketValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid ticket ID"),
  }),
  body: z.object({
    status: z.enum(TICKET_STATUSES).optional(),
    assignedTo: z.string().uuid("Invalid assignee ID").nullable().optional(),
  }),
});

export type TCreateTicketPayload = z.infer<
  typeof createTicketValidation
>["body"];

export const SupportTicketValidation = {
  createTicketValidation,
  listTicketsQueryValidation,
  updateTicketValidation,
};
