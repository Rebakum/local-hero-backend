import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { resolveTradeRelations } from "../../utils/tradeResolver";
import { recalculateActiveProsCount } from "../trades/trade.service";
import { IGetAllProfessionalsQuery } from "./professional.interface";

const getAll = async (query: IGetAllProfessionalsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  if (query.featured === "true") {
    where.isFeatured = true;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { companyName: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.location) {
    where.location = { contains: query.location, mode: "insensitive" };
  }

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
      include: {
        testimonialsReceived: {
          where: { isApproved: true },
          select: { rating: true },
        },
      },
    }),
    prisma.professional.count({ where }),
  ]);

  // Derive rating + review count from the professional's live (approved)
  // reviews instead of trusting stale counters stored on the row.
  const professionalsWithReviews = professionals.map(
    ({ testimonialsReceived, ...professional }) => {
      const reviewCount = testimonialsReceived.length;
      const rating =
        reviewCount === 0
          ? professional.rating
          : testimonialsReceived.reduce((sum, t) => sum + t.rating, 0) / reviewCount;

      return {
        ...professional,
        reviewCount,
        rating: Math.round(rating * 10) / 10,
      };
    }
  );

  return {
    professionals: professionalsWithReviews,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const professional = await prisma.professional.findUnique({
    where: { id },
    include: {
      // Only approved reviews are public. Hidden/moderation reviews must not
      // surface on the professional profile.
      testimonialsReceived: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  const { testimonialsReceived, ...rest } = professional;
  const reviewCount = testimonialsReceived.length;
  const rating =
    reviewCount === 0
      ? rest.rating
      : testimonialsReceived.reduce((sum, t) => sum + t.rating, 0) / reviewCount;

  return {
    ...rest,
    reviewCount,
    rating: Math.round(rating * 10) / 10,
    reviews: testimonialsReceived,
  };
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.professional.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Professional not found");
  }

  const payload = { ...(data as any) };

  if (payload.trade) {
    const resolved = await resolveTradeRelations(payload.trade);
    payload.tradeId = resolved.tradeId;
    payload.professionId = resolved.professionId;
    payload.trade = resolved.trade;
  } else {
    // Keep the existing relations when the trade string is not being changed.
    delete payload.tradeId;
    delete payload.professionId;
  }

  const professional = await prisma.professional.update({
    where: { id },
    data: payload,
  });

  // Recalculate for both the previous and the new trade so a trade move
  // keeps both counts accurate.
  await recalculateActiveProsCount(payload.tradeId ?? existing.tradeId);
  if (payload.tradeId && payload.tradeId !== existing.tradeId) {
    await recalculateActiveProsCount(existing.tradeId);
  }

  return professional;
};

const deleteProfessional = async (id: string) => {
  const existing = await prisma.professional.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Professional not found");
  }

  const [bookingCount, conversationCount, testimonialCount, quoteResponseCount, savedProfessionalCount] = await Promise.all([
    prisma.booking.count({ where: { professionalId: id } }),
    prisma.conversation.count({ where: { professionalId: id } }),
    prisma.testimonial.count({ where: { professionalId: id } }),
    prisma.quoteResponse.count({ where: { professionalId: id } }),
    prisma.savedProfessional.count({ where: { professionalId: id } }),
  ]);

  const linkedCount = bookingCount + conversationCount + testimonialCount + quoteResponseCount + savedProfessionalCount;

  if (linkedCount > 0) {
    throw new AppError(
      409,
      `Cannot delete this professional — ${bookingCount} booking(s), ${conversationCount} conversation(s), ${testimonialCount} testimonial(s), ${quoteResponseCount} quote response(s), and ${savedProfessionalCount} saved professional record(s) are still linked to it. Remove or reassign them first.`
    );
  }

  await prisma.professional.delete({ where: { id } });

  await recalculateActiveProsCount(existing.tradeId);
};

export const ProfessionalService = {
  getAll,
  getById,
  update,
  deleteProfessional,
};
