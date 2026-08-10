import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import AppError from "../utils/AppError";

const roleGuard = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, "You are not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          `Access denied. Required roles: ${allowedRoles.join(", ")}`
        )
      );
    }

    next();
  };
};

export default roleGuard;
