import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AvailabilityOptionService } from "./availability-option.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
  const result = await AvailabilityOptionService.getAll();

  sendResponse(res, 200, "Availability options retrieved successfully", result);
});

export const AvailabilityOptionController = {
  getAll,
};
