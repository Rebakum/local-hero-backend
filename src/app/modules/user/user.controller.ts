import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { IGetAllUsersQuery } from "./user.interface";

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    if (req.authTokenPresent) {
      // Token supplied but invalid/expired — signal the client to refresh.
      sendResponse(res, 401, "User not authenticated", null);
    } else {
      // No session at all — anonymous visitor, not an error.
      sendResponse(res, 200, "No active session", null);
    }
    return;
  }
  const result = await UserService.getProfile(userId);

  sendResponse(res, 200, "Profile retrieved successfully", result);
});

const applyProvider = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }
  const result = await UserService.applyProvider(userId, req.body);

  sendResponse(res, 200, "Provider application submitted successfully", result);
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }
  const result = await UserService.updateProfile(userId, req.body);

  sendResponse(res, 200, "Profile updated successfully", result);
});

const deleteProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }
  await UserService.deleteProfile(userId, req.body);

  sendResponse(res, 200, "Account deleted successfully", null);
});

export const UserController = {
  getProfile,
  applyProvider,
  updateProfile,
  deleteProfile,
};
