import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProfessionService } from "./profession.service";
import { IGetAllProfessionsQuery } from "./profession.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfessionService.getAll(
    req.query as IGetAllProfessionsQuery
  );

  sendResponse(
    res,
    200,
    "Professions retrieved successfully",
    result.professions,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProfessionService.getById(id);

  sendResponse(res, 200, "Profession retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfessionService.create(req.body);

  sendResponse(res, 201, "Profession created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProfessionService.update(id, req.body);

  sendResponse(res, 200, "Profession updated successfully", result);
});

const deleteProfession = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ProfessionService.deleteProfession(id);

  sendResponse(res, 200, "Profession deleted successfully", null);
});

export const ProfessionController = {
  getAll,
  getById,
  create,
  update,
  deleteProfession,
};
