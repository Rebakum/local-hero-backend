import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SubscriptionService } from "./subscription.service";
import { TCreateSubscriptionPayload, TUpdateSubscriptionPayload } from "./subscription.validation";

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.getMySubscription(req.user!.userId);

  sendResponse(res, 200, "Subscription retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.create(
    req.body as TCreateSubscriptionPayload
  );

  sendResponse(res, 201, "Subscription created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionService.update(
    id,
    req.body as TUpdateSubscriptionPayload
  );

  sendResponse(res, 200, "Subscription updated successfully", result);
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.getAll(
    req.query as { page?: string; limit?: string; plan?: string; status?: string }
  );

  sendResponse(
    res,
    200,
    "Subscriptions retrieved successfully",
    result.subscriptions,
    result.meta
  );
});

export const SubscriptionController = {
  getMySubscription,
  create,
  update,
  getAll,
};
