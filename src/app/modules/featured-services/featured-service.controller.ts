import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FeaturedServiceService } from "./featured-service.service";
import { TGetFeaturedServicesQuery } from "./featured-service.validation";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await FeaturedServiceService.getAll(
    req.query as TGetFeaturedServicesQuery
  );

  sendResponse(
    res,
    200,
    "Featured services retrieved successfully",
    result.services,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FeaturedServiceService.getById(id);

  sendResponse(res, 200, "Featured service retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await FeaturedServiceService.create(req.body);

  sendResponse(res, 201, "Featured service created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FeaturedServiceService.update(id, req.body);

  sendResponse(res, 200, "Featured service updated successfully", result);
});

const deleteFeaturedService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await FeaturedServiceService.deleteFeaturedService(id);

  sendResponse(res, 200, "Featured service deleted successfully", null);
});

export const FeaturedServiceController = {
  getAll,
  getById,
  create,
  update,
  deleteFeaturedService,
};
