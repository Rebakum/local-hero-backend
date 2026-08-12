import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import {
  TCreateTestimonialPayload,
  TGetTestimonialsQuery,
  TUpdateTestimonialPayload,
} from "./testimonial.validation";

const getAll = async (
  query: TGetTestimonialsQuery,
  requester?: { role: string }
) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const isAdmin =
    !!requester && ["ADMIN", "SUPER_ADMIN"].includes(requester.role);

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  // Public visitors must only ever see approved testimonials. Admins see
  // everything by default (so the management screen can moderate) and can
  // narrow down with the explicit isApproved filter.
  if (isAdmin) {
    if (query.isApproved !== undefined) {
      where.isApproved = query.isApproved === "true";
    }
  } else {
    where.isApproved = true;
  }

  if (query.isFeatured !== undefined) {
    where.isFeatured = query.isFeatured === "true";
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

// Testimonials posted by the logged-in user (used by the customer/provider
// dashboard to list, edit and delete their own reviews).
const getMyTestimonials = async (userId: string) => {
  return prisma.testimonial.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
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
  user: { userId: string; role: string },
  data: TUpdateTestimonialPayload
) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);

  if (!isAdmin && existing.userId !== user.userId) {
    throw new AppError(403, "You can only update your own testimonial");
  }

  // Only admins may change moderation/visibility flags.
  const { isApproved, isFeatured, ...ownerData } = data;
  const safeData = isAdmin
    ? data
    : ownerData;

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: safeData,
  });

  return testimonial;
};

// The professional whose business the review belongs to can reply publicly.
const respond = async (
  id: string,
  professionalUserId: string,
  businessResponse: string
) => {
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });

  if (!testimonial) {
    throw new AppError(404, "Testimonial not found");
  }

  const professional = await prisma.professional.findUnique({
    where: { userId: professionalUserId },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  if (!testimonial.professionalId || testimonial.professionalId !== professional.id) {
    throw new AppError(
      403,
      "You can only respond to reviews about your own business"
    );
  }

  return prisma.testimonial.update({
    where: { id },
    data: {
      businessResponse: businessResponse.trim(),
      businessResponseAt: new Date(),
    },
  });
};

const deleteTestimonial = async (
  id: string,
  user: { userId: string; role: string }
) => {
  const existing = await prisma.testimonial.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Testimonial not found");
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  if (!isAdmin && existing.userId !== user.userId) {
    throw new AppError(403, "You can only delete your own testimonial");
  }

  await prisma.testimonial.delete({ where: { id } });
};

export const TestimonialService = {
  getAll,
  getById,
  getMyTestimonials,
  create,
  update,
  respond,
  deleteTestimonial,
};