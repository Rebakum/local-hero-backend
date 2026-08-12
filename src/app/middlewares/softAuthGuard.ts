import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import config from "../../config";

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

// Like authGuard but never rejects. Used by session-check endpoints (e.g.
// GET /users/me) so an anonymous visitor gets a clean 200 with `data: null`
// instead of a 401 (and the frontend firing a pointless refresh attempt).
//
// - No token provided      -> req.user stays undefined, authTokenPresent=false
// - Valid token            -> req.user is populated, authTokenPresent=true
// - Invalid/expired token  -> req.user stays undefined, authTokenPresent=true
//   (so the controller can return 401 and let the client refresh)
const softAuthGuard = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    req.authTokenPresent = false;
    return next();
  }

  req.authTokenPresent = true;

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as Role,
    };
  } catch {
    // Invalid/expired token — req.user stays undefined.
  }

  next();
};

export default softAuthGuard;
