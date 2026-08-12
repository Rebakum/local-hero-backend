import { z } from "zod";

const professionalIdValidation = z.object({
  params: z.object({
    professionalId: z.string().uuid("Invalid professional ID"),
  }),
});

export const FavouriteValidation = {
  professionalIdValidation,
};
