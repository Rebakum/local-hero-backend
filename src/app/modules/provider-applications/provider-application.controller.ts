import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProviderApplicationService } from "./provider-application.service";
import { TGetProviderApplicationsQuery } from "./provider-application.validation";

const create = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const result = await ProviderApplicationService.create(userId, req.body);

  sendResponse(res, 201, "Provider application submitted successfully", result);
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const result = await ProviderApplicationService.getMyApplication(userId);

  sendResponse(res, 200, "Provider application retrieved successfully", result);
});

const updateMyApplication = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const { id } = req.params;
  const result = await ProviderApplicationService.updateMyApplication(userId, id, req.body);

  sendResponse(res, 200, "Provider application updated successfully", result);
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderApplicationService.getAll(
    req.query as TGetProviderApplicationsQuery
  );

  sendResponse(
    res,
    200,
    "Provider applications retrieved successfully",
    result.applications,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProviderApplicationService.getById(id);

  sendResponse(res, 200, "Provider application retrieved successfully", result);
});

const approve = catchAsync(async (req: Request, res: Response) => {
  const reviewerId = req.user?.userId;
  if (!reviewerId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const { id } = req.params;
  const result = await ProviderApplicationService.approve(id, reviewerId);

  sendResponse(res, 200, "Provider application approved successfully", result);
});

const reject = catchAsync(async (req: Request, res: Response) => {
  const reviewerId = req.user?.userId;
  if (!reviewerId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const { id } = req.params;
  const { rejectionReason } = req.body;
  const result = await ProviderApplicationService.reject(id, reviewerId, rejectionReason);

  sendResponse(res, 200, "Provider application rejected successfully", result);
});

export const ProviderApplicationController = {
  create,
  getMyApplication,
  updateMyApplication,
  getAll,
  getById,
  approve,
  reject,
};
