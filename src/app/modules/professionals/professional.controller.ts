import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProfessionalService } from "./professional.service";
import { IGetAllProfessionalsQuery } from "./professional.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfessionalService.getAll(
    req.query as IGetAllProfessionalsQuery
  );

  sendResponse(
    res,
    200,
    "Professionals retrieved successfully",
    result.professionals,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProfessionalService.getById(id);

  sendResponse(res, 200, "Professional retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfessionalService.create(req.body);

  sendResponse(res, 201, "Professional created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProfessionalService.update(id, req.body);

  sendResponse(res, 200, "Professional updated successfully", result);
});

const deleteProfessional = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ProfessionalService.deleteProfessional(id);

  sendResponse(res, 200, "Professional deleted successfully", null);
});

export const ProfessionalController = {
  getAll,
  getById,
  create,
  update,
  deleteProfessional,
};
