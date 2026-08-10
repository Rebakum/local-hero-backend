import { Request, Response, NextFunction } from "express";
import config from "../../config";

interface IError {
  statusCode?: number;
  message?: string;
  isOperational?: boolean;
  stack?: string;
  code?: string | number;
  errors?: Record<string, { message: string }>;
}

const globalErrorHandler = (
  err: IError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.code === "P2002") {
    statusCode = 409;
    message = "A record with this value already exists.";
  }

  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found.";
  }

  // Multer file-upload errors (wrong field name, file too large, etc.)
  // arrive with a "LIMIT_*" code instead of a statusCode.
  if (typeof err.code === "string" && err.code.startsWith("LIMIT_")) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Image is too large. Maximum size is 5MB.";
    } else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Too many images, or wrong upload field name.";
    }
  }

  if (err.errors) {
    statusCode = 400;
    message = "Validation Error";
  }

  const response: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
  };

  if (config.nodeEnv === "development") {
    response.stack = err.stack;
    response.error = err;
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
