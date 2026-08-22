import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SuperAdminService } from "./super-admin.service";
import { Role } from "@prisma/client";

const getPendingUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await SuperAdminService.getPendingUsers(req.query as any);

  sendResponse(
    res,
    200,
    "Pending users retrieved successfully",
    result.users,
    result.meta
  );
});

const approveUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SuperAdminService.approveUser(id);

  sendResponse(res, 200, "User approved successfully", result);
});

const rejectUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SuperAdminService.rejectUser(id);

  sendResponse(res, 200, "User rejected successfully", result);
});

const changeUserRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const result = await SuperAdminService.changeUserRole(id, role as Role);

  sendResponse(res, 200, "User role updated successfully", result);
});

const getSystemHealth = catchAsync(async (_req: Request, res: Response) => {
  const result = await SuperAdminService.getSystemHealth();

  sendResponse(res, 200, "System health retrieved successfully", result);
});

export const SuperAdminController = {
  getPendingUsers,
  approveUser,
  rejectUser,
  changeUserRole,
  getSystemHealth,
};
