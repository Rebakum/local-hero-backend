import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FAQService } from "./faq.service";
import { IGetAllFAQsQuery } from "./faq.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.getAll(
    req.query as IGetAllFAQsQuery
  );

  sendResponse(
    res,
    200,
    "FAQs retrieved successfully",
    result.faqs,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FAQService.getById(id);

  sendResponse(res, 200, "FAQ retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.create(req.body);

  sendResponse(res, 201, "FAQ created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FAQService.update(id, req.body);

  sendResponse(res, 200, "FAQ updated successfully", result);
});

const deleteFAQ = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await FAQService.deleteFAQ(id);

  sendResponse(res, 200, "FAQ deleted successfully", null);
});

export const FAQController = {
  getAll,
  getById,
  create,
  update,
  deleteFAQ,
};
