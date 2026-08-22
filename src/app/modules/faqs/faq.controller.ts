import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FaqService } from "./faq.service";
import { TGetFaqsQuery } from "./faq.validation";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getAll(
    req.query as TGetFaqsQuery,
    false
  );

  sendResponse(
    res,
    200,
    "FAQs retrieved successfully",
    result.faqs,
    result.meta
  );
});

const getAllAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.getAll(
    req.query as TGetFaqsQuery,
    true
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
  const result = await FaqService.getById(id);

  sendResponse(res, 200, "FAQ retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqService.create(req.body);

  sendResponse(res, 201, "FAQ created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FaqService.update(id, req.body);

  sendResponse(res, 200, "FAQ updated successfully", result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await FaqService.remove(id);

  sendResponse(res, 200, "FAQ deleted successfully", null);
});

export const FaqController = {
  getAll,
  getAllAdmin,
  getById,
  create,
  update,
  remove,
};