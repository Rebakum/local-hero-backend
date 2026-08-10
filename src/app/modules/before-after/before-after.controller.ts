import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { BeforeAfterService } from "./before-after.service";
import { IGetAllBeforeAfterQuery } from "./before-after.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await BeforeAfterService.getAll(
    req.query as IGetAllBeforeAfterQuery
  );

  sendResponse(
    res,
    200,
    "Before/After projects retrieved successfully",
    result.projects,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BeforeAfterService.getById(id);

  sendResponse(res, 200, "Before/After project retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await BeforeAfterService.create(req.body);

  sendResponse(res, 201, "Before/After project created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BeforeAfterService.update(id, req.body);

  sendResponse(res, 200, "Before/After project updated successfully", result);
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await BeforeAfterService.deleteProject(id);

  sendResponse(res, 200, "Before/After project deleted successfully", null);
});

export const BeforeAfterController = {
  getAll,
  getById,
  create,
  update,
  deleteProject,
};
