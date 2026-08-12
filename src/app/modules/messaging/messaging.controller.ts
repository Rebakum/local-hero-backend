import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { MessagingService } from "./messaging.service";
import { TSendMessagePayload } from "./messaging.validation";

const createConversation = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { professionalId, bookingId } = req.body as {
    professionalId: string;
    bookingId?: string;
  };
  const result = await MessagingService.getOrCreateConversation(
    userId,
    professionalId,
    bookingId
  );

  sendResponse(res, 201, "Conversation created successfully", result);
});

const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await MessagingService.getMyConversations(userId);

  sendResponse(res, 200, "Conversations retrieved successfully", result);
});

const getConversationById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MessagingService.getConversationById(
    id,
    req.user!.userId
  );

  sendResponse(res, 200, "Conversation retrieved successfully", result);
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MessagingService.sendMessage(
    id,
    req.user!.userId,
    req.body as TSendMessagePayload
  );

  sendResponse(res, 201, "Message sent successfully", result);
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MessagingService.getMessages(id, req.user!.userId);

  sendResponse(res, 200, "Messages retrieved successfully", result);
});

const markConversationRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MessagingService.markConversationRead(
    id,
    req.user!.userId
  );

  sendResponse(res, 200, "Conversation marked as read", result);
});

export const MessagingController = {
  createConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  getMessages,
  markConversationRead,
};
