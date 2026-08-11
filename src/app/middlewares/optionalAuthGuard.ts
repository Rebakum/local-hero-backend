import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import config from "../../config";

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

// Like authGuard, but never blocks the request. If a valid token is present
// (cookie or Bearer header) req.user is populated; otherwise the request
// continues anonymously. Used on endpoints that behave differently for
// authenticated admins but must stay publicly accessible.
const optionalAuthGuard = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as Role,
      };
    }

    next();
  } catch {
    // Invalid/expired token on an optional route: continue anonymously.
    next();
  }
};

export default optionalAuthGuard;
