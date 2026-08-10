import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import AppError from "../utils/AppError";

const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message).join("; ");
        next(new AppError(400, messages));
      } else {
        next(error);
      }
    }
  };
};

export default validateRequest;
