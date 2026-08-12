import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: Role;
      };
      // Set by softAuthGuard: true when an access token was supplied but was
      // invalid/expired, false when no token was provided at all.
      authTokenPresent?: boolean;
    }
  }
}

export {};
