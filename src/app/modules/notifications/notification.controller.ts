import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await NotificationService.getMyNotifications(
    userId,
    req.query as { page?: string; limit?: string; unread?: string }
  );

  sendResponse(
    res,
    200,
    "Notifications retrieved successfully",
    result.notifications,
    result.meta
  );
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NotificationService.markAsRead(id, req.user!.userId);

  sendResponse(res, 200, "Notification marked as read", result);
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.userId);

  sendResponse(res, 200, "All notifications marked as read", result);
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
