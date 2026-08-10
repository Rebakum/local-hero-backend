import { z } from "zod";

const EventStatus = z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]);

const createEventValidation = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be at most 200 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description must be at most 2000 characters"),
    price: z.coerce
      .number({ invalid_type_error: "Price must be a number" })
      .positive("Price must be a positive number"),
    date: z.coerce.date({ invalid_type_error: "Invalid date format" }),
    location: z.string().trim().optional(),
    status: EventStatus.default("UPCOMING"),
  }),
});

const updateEventValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID"),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description must be at most 2000 characters")
      .optional(),
    price: z.coerce
      .number({ invalid_type_error: "Price must be a number" })
      .positive("Price must be a positive number")
      .optional(),
    date: z.coerce.date({ invalid_type_error: "Invalid date format" }).optional(),
    location: z.string().trim().optional(),
    status: EventStatus.optional(),
  }),
});

const getEventValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID"),
  }),
});

const getAllEventsQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    sortBy: z
      .enum(["createdAt", "date", "title", "price"])
      .default("createdAt"),
    status: EventStatus.optional(),
  }),
});

export type TCreateEventPayload = z.infer<typeof createEventValidation>["body"];
export type TUpdateEventPayload = z.infer<typeof updateEventValidation>["body"];
export type TGetEventsQuery = z.infer<typeof getAllEventsQueryValidation>["query"];
export type TEventStatus = z.infer<typeof EventStatus>;

export const EventValidation = {
  createEventValidation,
  updateEventValidation,
  getEventValidation,
  getAllEventsQueryValidation,
};
