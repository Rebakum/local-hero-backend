import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { BookingService } from "./booking.service";
import { TGetBookingsQuery } from "./booking.validation";

const create = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await BookingService.create(userId, req.body);
  sendResponse(res, 201, "Booking request submitted successfully", result);
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await BookingService.getMyBookings(userId);
  sendResponse(res, 200, "Your bookings retrieved successfully", result);
});

const getProviderBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await BookingService.getProviderBookings(userId);
  sendResponse(res, 200, "Assigned bookings retrieved successfully", result);
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingService.getAll(req.query as TGetBookingsQuery);
  sendResponse(res, 200, "Bookings retrieved successfully", result.bookings, result.meta);
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.getById(id, req.user!);
  sendResponse(res, 200, "Booking retrieved successfully", result);
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.updateStatus(id, req.user!, req.body);
  sendResponse(res, 200, "Booking status updated successfully", result);
});

const assignProfessional = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { professionalId } = req.body;
  const result = await BookingService.assignProfessional(id, professionalId);
  sendResponse(res, 200, "Professional assigned to booking successfully", result);
});

export const BookingController = {
  create,
  getMyBookings,
  getProviderBookings,
  getAll,
  getById,
  updateStatus,
  assignProfessional,
};
