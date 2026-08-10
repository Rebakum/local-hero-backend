import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import config from "../../config";

interface IErrorDetails {
  field: string;
  message: string;
}

interface IExpressError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string | number;
}

const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errorDetails: IErrorDetails[] | undefined;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errorDetails = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof Error) {
    const appError = err as IExpressError;
    statusCode = appError.statusCode || 500;
    message = appError.message || "Internal Server Error";

    if (appError.code === "P2002") {
      statusCode = 409;
      message = "A record with this value already exists.";
    }

    if (appError.code === "P2025") {
      statusCode = 404;
      message = "Record not found.";
    }

    // Multer file-upload errors (wrong field name, file too large, etc.)
    // arrive with a "LIMIT_*" code instead of a statusCode.
    if (typeof appError.code === "string" && appError.code.startsWith("LIMIT_")) {
      statusCode = 400;
      if (appError.code === "LIMIT_FILE_SIZE") {
        message = "Image is too large. Maximum size is 5MB.";
      } else if (
        appError.code === "LIMIT_FILE_COUNT" ||
        appError.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        message = "Too many images, or wrong upload field name.";
      }
    }
  }

  const response: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
  };

  if (errorDetails) {
    response.errorDetails = errorDetails;
  }

  if (config.nodeEnv === "development" && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default globalErrorHandler;
