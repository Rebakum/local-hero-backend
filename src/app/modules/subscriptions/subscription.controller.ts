import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SubscriptionService } from "./subscription.service";
import {
  TCreateSubscriptionPayload,
  TUpdateSubscriptionPayload,
} from "./subscription.validation";

// Active plans (any authenticated user can browse).
const getPlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await SubscriptionService.getPlans();

  sendResponse(res, 200, "Plans retrieved successfully", plans);
});

// Featured add-on options (7/30/90 days).
const getFeaturedAddons = catchAsync(async (req: Request, res: Response) => {
  const addons = await SubscriptionService.getFeaturedAddons();

  sendResponse(res, 200, "Featured add-ons retrieved successfully", addons);
});

// Provider: my subscription.
const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.getMySubscription(req.user!.userId);

  sendResponse(res, 200, "Subscription retrieved successfully", result);
});

// Provider: create Stripe Checkout session (subscription mode).
const checkout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { planId } = req.body;

  const result = await SubscriptionService.createCheckout(userId, planId);

  sendResponse(res, 201, "Checkout session created successfully", result);
});

// Provider: create Stripe Checkout session for a Featured add-on (one-time).
const featureCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { addonId } = req.body;

  const result = await SubscriptionService.createFeatureCheckout(userId, addonId);

  sendResponse(res, 201, "Featured checkout session created successfully", result);
});

// Provider: change to another paid plan.
const changePlan = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { planId } = req.body;

  const result = await SubscriptionService.changePlan(userId, planId);

  sendResponse(res, 200, "Plan change submitted", result);
});

// Provider: cancel at period end.
const cancel = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const result = await SubscriptionService.cancel(userId);

  sendResponse(res, 200, "Subscription cancellation scheduled", result);
});

// Provider: resume a scheduled-cancel subscription.
const resume = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const result = await SubscriptionService.resume(userId);

  sendResponse(res, 200, "Subscription resumed", result);
});

// Provider: Stripe Billing Portal session.
const billingPortal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const result = await SubscriptionService.billingPortal(userId);

  sendResponse(res, 200, "Billing portal session created", result);
});

// Admin: create / upsert a subscription for a professional.
const create = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.create(
    req.body as TCreateSubscriptionPayload
  );

  sendResponse(res, 201, "Subscription created successfully", result);
});

// Admin: update a subscription.
const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionService.update(
    id,
    req.body as TUpdateSubscriptionPayload
  );

  sendResponse(res, 200, "Subscription updated successfully", result);
});

// Admin: list all subscriptions.
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
  getPlans,
  getFeaturedAddons,
  getMySubscription,
  checkout,
  featureCheckout,
  changePlan,
  cancel,
  resume,
  billingPortal,
  create,
  update,
  getAll,
};
