import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { resolveTradeRelations } from "../../utils/tradeResolver";
import { sendTransactionalEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
import { TCreateQuotePayload } from "./quote.validation";

const professionalSelect = {
  select: {
    id: true,
    name: true,
    companyName: true,
    trade: true,
    avatar: true,
    rating: true,
    reviewCount: true,
    hourlyRate: true,
    location: true,
    postcodeArea: true,
    isVerified: true,
  },
} as const;

const quoteInclude = {
  responses: {
    include: { professional: professionalSelect },
    orderBy: { amountInPence: "asc" as const },
  },
  customer: {
    select: { id: true, name: true, email: true },
  },
} as const;

// A customer posts a request describing the work they need done.
const createQuote = async (customerId: string, data: TCreateQuotePayload) => {
  let tradeId: string;
  let professionId: string;
  let trade: string;

  if (data.professionId) {
    const profession = await prisma.profession.findUnique({
      where: { id: data.professionId },
      include: { trade: { select: { id: true, category: true } } },
    });
    if (!profession) {
      throw new AppError(404, "Profession not found");
    }
    tradeId = profession.tradeId;
    professionId = profession.id;
    trade = profession.trade.category;
  } else {
    const resolved = await resolveTradeRelations(data.trade);
    tradeId = resolved.tradeId;
    professionId = resolved.professionId;
    trade = resolved.trade;
  }

  return prisma.quote.create({
    data: {
      customerId,
      tradeId,
      professionId,
      trade,
      postcode: data.postcode,
      city: data.city,
      description: data.description,
      budgetInPence: data.budgetInPence,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
    },
    include: quoteInclude,
  }).then(async (quote) => {
    // New lead -> notify + email providers matching this trade so they can quote.
    const providers = await prisma.professional.findMany({
      where: { tradeId, userId: { not: null } },
      select: { userId: true },
    });
    await Promise.all(
      providers
        .map((p) => p.userId)
        .filter((id): id is string => !!id)
        .map(async (userId) => {
          void NotificationService.create({
            userId,
            type: "NEW_QUOTE",
            title: "New lead available",
            body: `A new ${trade} job in ${data.city} needs a quote.`,
            data: { quoteId: quote.id },
          }).catch(() => undefined);

          const proUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });
          if (proUser?.email) {
            void sendTransactionalEmail("NEW_LEAD", proUser.email, {
              professionalName: proUser.name,
              trade,
              city: data.city,
              postcode: data.postcode,
              description: data.description,
            });
          }
        })
    );
    return quote;
  });
};

// Customer: all quotes I posted.
const getMyQuotes = async (customerId: string) => {
  return prisma.quote.findMany({
    where: { customerId },
    include: quoteInclude,
    orderBy: { createdAt: "desc" },
  });
};

// Provider: open quotes (PENDING) I have not responded to yet.
const getAvailableQuotes = async (professionalId: string) => {
  return prisma.quote.findMany({
    where: {
      status: "PENDING",
      responses: { none: { professionalId } },
    },
    include: { responses: { include: { professional: professionalSelect } } },
    orderBy: { createdAt: "desc" },
  });
};

// Provider: quotes I have responded to.
const getProviderQuotes = async (professionalId: string) => {
  return prisma.quote.findMany({
    where: { responses: { some: { professionalId } } },
    include: {
      responses: {
        include: { professional: professionalSelect },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getQuoteById = async (
  id: string,
  requester: { userId: string; role: string }
) => {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: quoteInclude,
  });

  if (!quote) {
    throw new AppError(404, "Quote not found");
  }

  const isAdmin = requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";
  const isOwner = quote.customerId === requester.userId;

  const professional = await prisma.professional.findUnique({
    where: { userId: requester.userId },
    select: { id: true },
  });

  const isInvolvedProfessional =
    !!professional &&
    quote.responses.some((r) => r.professionalId === professional.id);

  if (!isOwner && !isAdmin && !isInvolvedProfessional) {
    throw new AppError(403, "You are not allowed to view this quote");
  }

  return quote;
};

// Provider responds with a quotation to a customer's quote request.
const respondToQuote = async (
  quoteId: string,
  professionalId: string,
  data: { amountInPence: number; message?: string }
) => {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });

  if (!quote) {
    throw new AppError(404, "Quote not found");
  }

  if (quote.status === "EXPIRED") {
    throw new AppError(400, "This quote has expired");
  }

  if (quote.status !== "PENDING" && quote.status !== "QUOTED") {
    throw new AppError(400, "This quote is no longer open for responses");
  }

  const existing = await prisma.quoteResponse.findUnique({
    where: { quoteId_professionalId: { quoteId, professionalId } },
  });

  if (existing) {
    throw new AppError(400, "You have already responded to this quote");
  }

  const response = await prisma.quoteResponse.create({
    data: {
      quoteId,
      professionalId,
      amountInPence: data.amountInPence,
      message: data.message,
    },
    include: { professional: professionalSelect },
  });

  await prisma.quote.updateMany({
    where: { id: quoteId, status: "PENDING" },
    data: { status: "QUOTED" },
  });

  await NotificationService.create({
    userId: quote.customerId,
    type: "QUOTE_RESPONSE",
    title: "New quote received",
    body: `A professional has quoted for your ${quote.trade} request.`,
    data: { quoteId, responseId: response.id },
  });

  const customerUser = await prisma.user.findUnique({
    where: { id: quote.customerId },
    select: { email: true, name: true },
  });

  if (customerUser?.email) {
    void sendTransactionalEmail("QUOTE_RESPONSE", customerUser.email, {
      customerName: customerUser.name,
      trade: quote.trade,
      professionalName: response.professional.companyName || response.professional.name,
      amountInPence: data.amountInPence,
      message: data.message,
    });
  }

  return response;
};

// Customer accepts or rejects a specific quotation.
const updateResponseStatus = async (
  quoteId: string,
  responseId: string,
  customerId: string,
  status: "ACCEPTED" | "REJECTED"
) => {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });

  if (!quote) {
    throw new AppError(404, "Quote not found");
  }

  if (quote.customerId !== customerId) {
    throw new AppError(403, "You can only manage your own quotes");
  }

  const response = await prisma.quoteResponse.findUnique({
    where: { id: responseId },
  });

  if (!response || response.quoteId !== quoteId) {
    throw new AppError(404, "Quote response not found");
  }

  if (status === "ACCEPTED") {
    // Accepting a quote immediately creates a Booking so the customer can
    // pay, the provider can complete the job, and a review can follow.
    await prisma.$transaction(async (tx) => {
      await tx.quoteResponse.update({
        where: { id: responseId },
        data: { status: "ACCEPTED" },
      });

      await tx.quoteResponse.updateMany({
        where: { quoteId, id: { not: responseId }, status: "PENDING" },
        data: { status: "REJECTED" },
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "ACCEPTED" },
      });

      const customer = await tx.user.findUnique({
        where: { id: quote.customerId },
      });

      await tx.booking.create({
        data: {
          customerId: quote.customerId,
          professionalId: response.professionalId,
          tradeId: quote.tradeId,
          professionId: quote.professionId,
          trade: quote.trade,
          postcode: quote.postcode,
          address: quote.postcode,
          bookingDate: quote.preferredDate ?? new Date(),
          timeSlot: "Flexible",
          urgency: "Standard",
          description: quote.description,
          fullName: customer?.name ?? "Customer",
          email: customer?.email ?? "",
          phone: customer?.phone ?? "",
          status: "ACCEPTED",
          priceInPence: response.amountInPence,
          quoteResponseId: response.id,
        },
      });
    });

    const professional = await prisma.professional.findUnique({
      where: { id: response.professionalId },
      select: { userId: true },
    });

    if (professional?.userId) {
      await NotificationService.create({
        userId: professional.userId,
        type: "QUOTE_RESPONSE",
        title: "Quote accepted",
        body: "The customer accepted your quotation and a booking was created.",
        data: { quoteId, responseId },
      });

      const proUser = await prisma.user.findUnique({
        where: { id: professional.userId },
        select: { email: true, name: true },
      });
      if (proUser?.email) {
        void sendTransactionalEmail("QUOTE_ACCEPTED", proUser.email, {
          professionalName: proUser.name,
          trade: quote.trade,
          amountInPence: response.amountInPence,
        });
      }
    }
  } else {
    await prisma.quoteResponse.update({
      where: { id: responseId },
      data: { status: "REJECTED" },
    });
  }

  return prisma.quoteResponse.findUnique({
    where: { id: responseId },
    include: { professional: professionalSelect },
  });
};

export const QuoteService = {
  createQuote,
  getMyQuotes,
  getAvailableQuotes,
  getProviderQuotes,
  getQuoteById,
  respondToQuote,
  updateResponseStatus,
};
