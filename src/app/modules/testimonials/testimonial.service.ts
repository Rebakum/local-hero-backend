import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { sendTransactionalEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
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
  // A review linked to a booking may only be left by the booking's customer,
  // and only once that booking has actually been COMPLETED. This prevents
  // arbitrary users reviewing someone else's booking and stops incomplete or
  // cancelled bookings from triggering the completed-service review flow.
  if (data.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { customerId: true, status: true },
    });

    if (!booking) {
      throw new AppError(404, "Booking not found");
    }
    if (booking.customerId !== userId) {
      throw new AppError(
        403,
        "You can only review your own completed bookings"
      );
    }
    if (booking.status !== "COMPLETED") {
      throw new AppError(400, "You can only review a completed booking");
    }
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      ...data,
      userId, 
    } as any,
  });

  // New review -> notify the reviewed professional.
  if (testimonial.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: testimonial.professionalId },
      select: { userId: true },
    });
    if (professional?.userId) {
      void NotificationService.create({
        userId: professional.userId,
        type: "NEW_REVIEW",
        title: "You received a new review",
        body: `${testimonial.author} rated your service ${testimonial.rating}/5.`,
        data: { testimonialId: testimonial.id },
      }).catch(() => undefined);

      const proUser = await prisma.user.findUnique({
        where: { id: professional.userId },
        select: { email: true, name: true },
      });
      if (proUser?.email) {
        void sendTransactionalEmail("NEW_REVIEW", proUser.email, {
          professionalName: proUser.name,
          author: testimonial.author,
          rating: testimonial.rating,
          comment: testimonial.comment,
        });
      }
    }
  }

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

  const updated = await prisma.testimonial.update({
    where: { id },
    data: {
      businessResponse: businessResponse.trim(),
      businessResponseAt: new Date(),
    },
  });

  // Notify + email the review author that the professional replied.
  if (testimonial.userId) {
    void NotificationService.create({
      userId: testimonial.userId,
      type: "REVIEW_REQUESTED",
      title: "The professional replied to your review",
      body: `${professional.companyName} replied to your review.`,
      data: { testimonialId: id },
    }).catch(() => undefined);

    const authorUser = await prisma.user.findUnique({
      where: { id: testimonial.userId },
      select: { email: true, name: true },
    });
    if (authorUser?.email) {
      void sendTransactionalEmail("REVIEW_RESPONSE", authorUser.email, {
        authorName: authorUser.name,
        businessName: professional.companyName,
        response: businessResponse.trim(),
      });
    }
  }

  return updated;
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