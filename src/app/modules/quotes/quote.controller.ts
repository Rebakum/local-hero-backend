import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { QuoteService } from "./quote.service";
import {
  TCreateQuotePayload,
  TListQuotesQuery,
  TRespondToQuotePayload,
  TUpdateQuoteResponseStatusPayload,
} from "./quote.validation";
import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";

const createQuote = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await QuoteService.createQuote(
    userId,
    req.body as TCreateQuotePayload
  );

  sendResponse(res, 201, "Quote request submitted successfully", result);
});

const getMyQuotes = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await QuoteService.getMyQuotes(userId);

  sendResponse(res, 200, "Your quotes retrieved successfully", result);
});

const getAvailableQuotes = catchAsync(async (req: Request, res: Response) => {
  const professional = await prisma.professional.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  const result = await QuoteService.getAvailableQuotes(professional.id);
  sendResponse(res, 200, "Available quotes retrieved successfully", result);
});

const getProviderQuotes = catchAsync(async (req: Request, res: Response) => {
  const professional = await prisma.professional.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  const result = await QuoteService.getProviderQuotes(professional.id);
  sendResponse(res, 200, "Your quote responses retrieved successfully", result);
});

const getQuoteById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await QuoteService.getQuoteById(id, req.user!);

  sendResponse(res, 200, "Quote retrieved successfully", result);
});

const respondToQuote = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const professional = await prisma.professional.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  const body = req.body as TRespondToQuotePayload;
  const result = await QuoteService.respondToQuote(id, professional.id, {
    amountInPence: body.amountInPence!,
    message: body.message,
  });

  sendResponse(res, 201, "Quote response submitted successfully", result);
});

const updateResponseStatus = catchAsync(async (req: Request, res: Response) => {
  const { id, responseId } = req.params;
  const { status } = req.body as TUpdateQuoteResponseStatusPayload;
  const result = await QuoteService.updateResponseStatus(
    id,
    responseId,
    req.user!.userId,
    status
  );

  sendResponse(res, 200, "Quote response updated successfully", result);
});

export const QuoteController = {
  createQuote,
  getMyQuotes,
  getAvailableQuotes,
  getProviderQuotes,
  getQuoteById,
  respondToQuote,
  updateResponseStatus,
};
