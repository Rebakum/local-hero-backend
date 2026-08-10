import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import config from "../../config";
import AppError from "../utils/AppError";

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
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

    if (!token) {
      throw new AppError(401, "You are not authorized to access this resource");
    }

    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as Role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, "Token has expired"));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, "Invalid or expired token"));
    } else {
      next(error);
    }
  }
};

export default authGuard;