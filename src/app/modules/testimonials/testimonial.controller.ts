import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TestimonialService } from "./testimonial.service";
import { TGetTestimonialsQuery } from "./testimonial.validation";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await TestimonialService.getAll(
    req.query as TGetTestimonialsQuery
  );

  sendResponse(
    res,
    200,
    "Testimonials retrieved successfully",
    result.testimonials,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TestimonialService.getById(id);

  sendResponse(res, 200, "Testimonial retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await TestimonialService.create(userId, req.body);

  sendResponse(res, 201, "Testimonial created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const result = await TestimonialService.update(id, user, req.body);

  sendResponse(res, 200, "Testimonial updated successfully", result);
});

const deleteTestimonial = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  await TestimonialService.deleteTestimonial(id, user);

  sendResponse(res, 200, "Testimonial deleted successfully", null);
});

export const TestimonialController = {
  getAll,
  getById,
  create,
  update,
  deleteTestimonial,
};