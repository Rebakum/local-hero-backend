import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import {
  TCreateTestimonialPayload,
  TGetTestimonialsQuery,
  TUpdateTestimonialPayload,
} from "./testimonial.validation";

const getAll = async (query: TGetTestimonialsQuery) => {
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
      { city: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [testimonials, total] = await Promise.all([
    prisma.testimonial.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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

const create = async (userId: string, data: TCreateTestimonialPayload) => {
  const testimonial = await prisma.testimonial.create({
    data: {
      ...data,
      userId, 
    } as any,
  });

  return testimonial;
};

const update = async (
  id: string,
  user: { id: string; role: string },
  data: TUpdateTestimonialPayload
) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  
  if (!isAdmin && (existing as any).userId !== user.id) {
    throw new AppError(403, "You can only update your own testimonial");
  }

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data,
  });

  return testimonial;
};

const deleteTestimonial = async (
  id: string,
  user: { id: string; role: string }
) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  if (!isAdmin && (existing as any).userId !== user.id) {
    throw new AppError(403, "You can only delete your own testimonial");
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