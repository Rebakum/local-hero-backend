import { Role } from "@prisma/client";

export interface IChangeRolePayload {
  role: Role;
}
