import { z } from "zod";

const changeRoleValidation = z.object({
  body: z.object({
    role: z.enum(["user", "serviceProvider", "ADMIN"], {
      errorMap: () => ({
        message: "Role must be one of: user, serviceProvider, ADMIN",
      }),
    }),
  }),
});

export const SuperAdminValidation = {
  changeRoleValidation,
};
