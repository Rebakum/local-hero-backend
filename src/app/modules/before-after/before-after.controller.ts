import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { BeforeAfterService } from "./before-after.service";
import { TGetBeforeAfterQuery } from "./before-after.validation";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await BeforeAfterService.getAll(
    req.query as TGetBeforeAfterQuery,
    false
  );

  sendResponse(
    res,
    200,
    "Before/After projects retrieved successfully",
    result.projects,
    result.meta
  );
});

const getAllAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await BeforeAfterService.getAll(
    req.query as TGetBeforeAfterQuery,
    true
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
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const result = await BeforeAfterService.create(req.body, userId);

  sendResponse(
    res,
    201,
    "Before/After submission received for review",
    result
  );
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const result = await BeforeAfterService.update(
    id,
    req.body,
    { userId: req.user.userId, role: req.user.role }
  );

  sendResponse(res, 200, "Before/After project updated successfully", result);
});

const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  await BeforeAfterService.deleteProject(id, {
    userId: req.user.userId,
    role: req.user.role,
  });

  sendResponse(res, 200, "Before/After project deleted successfully", null);
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const result = await BeforeAfterService.updateStatus(
    id,
    status,
    rejectionReason
  );

  sendResponse(
    res,
    200,
    `Before/After project ${status.toLowerCase()}`,
    result
  );
});

const toggleFeature = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BeforeAfterService.toggleFeature(id);

  sendResponse(res, 200, "Before/After feature status updated", result);
});

const getEligibleBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const bookings = await BeforeAfterService.getEligibleBookings(userId);

  sendResponse(res, 200, "Eligible bookings retrieved successfully", bookings);
});

const getMySubmissions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, 401, "User not authenticated", null);
    return;
  }

  const projects = await BeforeAfterService.getMySubmissions(userId);

  sendResponse(res, 200, "Your submissions retrieved successfully", projects);
});

export const BeforeAfterController = {
  getAll,
  getAllAdmin,
  getById,
  create,
  update,
  deleteProject,
  updateStatus,
  toggleFeature,
  getEligibleBookings,
  getMySubmissions,
};
