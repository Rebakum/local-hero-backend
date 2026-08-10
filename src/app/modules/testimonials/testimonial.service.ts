import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllTestimonialsQuery } from "./testimonial.interface";

const getAll = async (query: IGetAllTestimonialsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  if (query.search) {
    where.OR = [
      { author: { contains: query.search, mode: "insensitive" } },
      { comment: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [testimonials, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.testimonial.count({ where }),
  ]);

  return {
    testimonials,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const testimonial = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!testimonial) {
    throw new AppError(404, "Testimonial not found");
  }

  return testimonial;
};

const create = async (data: Record<string, unknown>) => {
  const testimonial = await prisma.testimonial.create({
    data: data as any,
  });

  return testimonial;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: data as any,
  });

  return testimonial;
};

const deleteTestimonial = async (id: string) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  await prisma.testimonial.delete({ where: { id } });
};

export const TestimonialService = {
  getAll,
  getById,
  create,
  update,
  deleteTestimonial,
};
