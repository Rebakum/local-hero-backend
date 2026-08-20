import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import config from "../../config";

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

// Like authGuard but never rejects: attaches req.user when a valid token is
// present, otherwise lets the request continue as anonymous. Used for public
// endpoints (e.g. the contact form) that still want to link logged-in users.
const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
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
  } catch {
    // Invalid/expired token — treat as anonymous.
  }

  next();
};

export default optionalAuth;
