import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route ${req.originalUrl} not found`));
};

export default notFound;
