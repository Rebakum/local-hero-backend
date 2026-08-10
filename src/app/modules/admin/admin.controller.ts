import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AdminService } from "./admin.service";
import { IGetAllUsersQuery } from "./admin.interface";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(
    req.query as IGetAllUsersQuery
  );

  sendResponse(
    res,
    200,
    "Users retrieved successfully",
    result.users,
    result.meta
  );
});

const approveUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.approveUser(id);

  sendResponse(res, 200, "User approved successfully", result);
});

const rejectUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.rejectUser(id);

  sendResponse(res, 200, "User rejected successfully", result);
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.userId;
  if (!adminId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const { id } = req.params;
  await AdminService.deleteUser(id, adminId);

  sendResponse(res, 200, "User deleted successfully", null);
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, 200, "Dashboard stats retrieved successfully", result);
});

export const AdminController = {
  getAllUsers,
  approveUser,
  rejectUser,
  deleteUser,
  getDashboardStats,
};
