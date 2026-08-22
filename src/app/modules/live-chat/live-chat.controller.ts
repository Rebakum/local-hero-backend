import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { LiveChatService } from "./live-chat.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await LiveChatService.createThread(req.body, req.user?.userId);
  sendResponse(res, 201, "Live chat started", result);
});

const get = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, 200, "Live chat retrieved", await LiveChatService.getThread(req.params.id));
});

const list = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, 200, "Live chats retrieved", await LiveChatService.listThreads());
});

const message = catchAsync(async (req: Request, res: Response) => {
  const role = req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN" ? "ADMIN" : req.user ? "USER" : "GUEST";
  sendResponse(res, 201, "Message sent", await LiveChatService.sendMessage(req.params.id, req.body.body, req.user?.userId, role));
});

const handoff = catchAsync(async (req: Request, res: Response) => {
  const result = await LiveChatService.requestHumanHandoff(req.params.id, req.body?.message);
  sendResponse(res, 200, "Human hand-off requested", result);
});

const resolve = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, 200, "Chat resolved", await LiveChatService.resolveThread(req.params.id));
});

const reactivate = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, 200, "AI assistant re-activated", await LiveChatService.reactivateAi(req.params.id));
});

const close = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, 200, "Chat closed", await LiveChatService.closeThread(req.params.id));
});

export const LiveChatController = { create, get, list, message, handoff, resolve, reactivate, close };