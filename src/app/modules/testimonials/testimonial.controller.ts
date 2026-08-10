import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TestimonialService } from "./testimonial.service";
import { IGetAllTestimonialsQuery } from "./testimonial.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await TestimonialService.getAll(
    req.query as IGetAllTestimonialsQuery
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
  const result = await TestimonialService.create(req.body);

  sendResponse(res, 201, "Testimonial created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TestimonialService.update(id, req.body);

  sendResponse(res, 200, "Testimonial updated successfully", result);
});

const deleteTestimonial = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await TestimonialService.deleteTestimonial(id);

  sendResponse(res, 200, "Testimonial deleted successfully", null);
});

export const TestimonialController = {
  getAll,
  getById,
  create,
  update,
  deleteTestimonial,
};
