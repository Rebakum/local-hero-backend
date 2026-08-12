import { z } from "zod";

const createConversationValidation = z.object({
  body: z.object({
    professionalId: z.string().uuid("Invalid professional ID"),
    bookingId: z.string().uuid("Invalid booking ID").optional(),
  }),
});

const sendMessageValidation = z
  .object({
    params: z.object({
      id: z.string().uuid("Invalid conversation ID"),
    }),
    body: z.object({
      body: z.string().max(5000, "Message is too long").optional(),
      image: z.string().url("Image must be a valid URL").nullable().optional(),
    }),
  })
  .refine(
    (data) => !!data.body.body?.trim() || !!data.body.image,
    { message: "A message body or image is required", path: ["body"] }
  );

const getConversationValidation = z.object({
  params: z.object({
    id: z.string().uuid("Invalid conversation ID"),
  }),
});

export type TCreateConversationPayload = z.infer<
  typeof createConversationValidation
>["body"];
export type TSendMessagePayload = z.infer<typeof sendMessageValidation>["body"];

export const MessagingValidation = {
  createConversationValidation,
  sendMessageValidation,
  getConversationValidation,
};
