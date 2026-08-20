import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SupportTicketService } from "./support-ticket.service";
import { TCreateTicketPayload } from "./support-ticket.validation";

// Public contact form (logged-in users are linked via optionalAuth).
const create = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportTicketService.create(
    req.body as TCreateTicketPayload,
    req.user?.userId
  );

  sendResponse(res, 201, "Support ticket created successfully", result);
});

// Authenticated user: their own tickets.
const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportTicketService.getMyTickets(req.user!.userId);

  sendResponse(res, 200, "Support tickets retrieved successfully", result);
});

// Admin: list all tickets.
const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportTicketService.getAll(
    req.query as { page?: string; limit?: string; status?: string }
  );

  sendResponse(
    res,
    200,
    "Support tickets retrieved successfully",
    result.tickets,
    result.meta
  );
});

// Admin: update a ticket (status / assignment).
const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SupportTicketService.update(id, req.body);

  sendResponse(res, 200, "Support ticket updated successfully", result);
});

export const SupportTicketController = {
  create,
  getMyTickets,
  getAll,
  update,
};
