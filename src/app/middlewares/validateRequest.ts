import { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

export type RequestValidationSchema = z.ZodType<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
  cookies?: unknown;
}>;

const validateRequest = (schema: RequestValidationSchema): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      if (parsed.body !== undefined) {
        req.body = parsed.body as Request["body"];
      }
      if (parsed.query !== undefined) {
        req.query = parsed.query as Request["query"];
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params as Request["params"];
      }
      if (parsed.cookies !== undefined) {
        req.cookies = parsed.cookies as Request["cookies"];
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
