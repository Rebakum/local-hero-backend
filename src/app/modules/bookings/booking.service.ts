import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { resolveTradeRelations } from "../../utils/tradeResolver";
import { sendTransactionalEmail, sendBookingCompletedReviewEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
import { TGetBookingsQuery } from "./booking.validation";

interface ICreateBookingInput {
  trade: string;
  professionalId?: string;
  postcode: string;
  address: string;
  bookingDate: string;
  timeSlot: string;
  urgency: string;
  description: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
}

const bookingInclude = {
  professional: {
    select: {
      id: true,
      name: true,
      companyName: true,
      trade: true,
      avatar: true,
      hourlyRate: true,
      userId: true,
    },
  },
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  payment: true,
} as const;

// Resolve the user account behind a professional profile, if any.
const getProfessionalUserId = async (professionalId: string | null) => {
  if (!professionalId) return null;
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { userId: true },
  });
  return professional?.userId ?? null;
};

// A customer books a service. If they picked a specific professional, we
// attach them right away; otherwise it stays unassigned until an admin (or
// the provider themselves, in a future iteration) picks it up.
const create = async (customerId: string, data: ICreateBookingInput) => {
  let assignedProUser: { userId: string | null; email?: string; name?: string } | null = null;

  if (data.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: data.professionalId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!professional) {
      throw new AppError(404, "Selected professional not found");
    }
    assignedProUser = {
      userId: professional.userId,
      email: professional.user?.email,
      name: professional.user?.name,
    };
  }

  const resolved = await resolveTradeRelations(data.trade);

  const booking = await prisma.booking.create({
    data: {
      customerId,
      professionalId: data.professionalId,
      tradeId: resolved.tradeId,
      professionId: resolved.professionId,
      trade: resolved.trade,
      postcode: data.postcode,
      address: data.address,
      bookingDate: new Date(data.bookingDate),
      timeSlot: data.timeSlot,
      urgency: data.urgency,
      description: data.description,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
    },
    include: bookingInclude,
  });

  // New booking request -> assigned provider.
  if (data.professionalId) {
    const proUserId = assignedProUser?.userId;
    if (proUserId) {
      void NotificationService.create({
        userId: proUserId,
        type: "BOOKING_REQUEST",
        title: "New booking request",
        body: `New ${resolved.trade} booking request from ${data.fullName} in ${data.postcode}.`,
        data: { bookingId: booking.id },
      }).catch(() => undefined);
    }

    if (assignedProUser?.email) {
      void sendTransactionalEmail("BOOKING_REQUEST", assignedProUser.email, {
        professionalName: assignedProUser.name,
        trade: resolved.trade,
        customerName: data.fullName,
        postcode: data.postcode,
        bookingDate: booking.bookingDate.toDateString(),
        timeSlot: data.timeSlot,
        description: data.description,
      });
    }
  }

  return booking;
};

const getMyBookings = async (customerId: string) => {
  return prisma.booking.findMany({
    where: { customerId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
};

// Bookings assigned to the professional profile linked to this user account.
const getProviderBookings = async (userId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { userId },
  });

  if (!professional) {
    throw new AppError(404, "You don't have a professional profile yet");
  }

  return prisma.booking.findMany({
    where: { professionalId: professional.id },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
};

const getAll = async (query: TGetBookingsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.status) where.status = query.status;
  if (query.trade) where.trade = query.trade;
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { postcode: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, meta: { page, limit, total } };
};

const getById = async (id: string, requester: { userId: string; role: string }) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const isOwner = booking.customerId === requester.userId;
  const isAdmin = requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";

  let isAssignedProvider = false;
  if (booking.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: booking.professionalId },
      select: { userId: true },
    });
    isAssignedProvider = professional?.userId === requester.userId;
  }

  if (!isOwner && !isAdmin && !isAssignedProvider) {
    throw new AppError(403, "You are not allowed to view this booking");
  }

  return booking;
};

// Covers accept / reject / start / complete / cancel / reschedule, all through
// one status transition endpoint so the state machine lives in one place.
const updateStatus = async (
  id: string,
  requester: { userId: string; role: string },
  data: {
    status: string;
    priceInPence?: number;
    professionalId?: string;
    bookingDate?: string;
    timeSlot?: string;
  }
) => {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  const previousStatus = booking.status;

  const isAdmin = requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";
  const isOwner = booking.customerId === requester.userId;

  let isAssignedProvider = false;
  if (booking.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: booking.professionalId },
    });
    isAssignedProvider = professional?.userId === requester.userId;
  }

  // Customers may only cancel their own, still-pending booking.
  if (isOwner && !isAdmin && !isAssignedProvider) {
    if (data.status !== "CANCELLED") {
      throw new AppError(403, "You can only cancel your own booking");
    }
    if (booking.status !== "PENDING" && booking.status !== "ACCEPTED") {
      throw new AppError(400, `Cannot cancel a booking that is already ${booking.status}`);
    }
  } else if (!isAdmin && !isAssignedProvider) {
    throw new AppError(403, "You are not allowed to update this booking");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: data.status as never,
      ...(data.priceInPence !== undefined ? { priceInPence: data.priceInPence } : {}),
      ...(data.professionalId !== undefined ? { professionalId: data.professionalId } : {}),
      ...(data.bookingDate !== undefined ? { bookingDate: new Date(data.bookingDate) } : {}),
      ...(data.timeSlot !== undefined ? { timeSlot: data.timeSlot } : {}),
    },
    include: bookingInclude,
  });

  // Notify the other party about the status change.
  await notifyStatusChange(
    updated,
    data.status,
    {
      requesterId: requester.userId,
      customerId: updated.customerId,
      proUserId: updated.professional?.userId ?? null,
      previousStatus,
    }
  );

  return updated;
};

// Notify the relevant user whenever a booking's status changes:
//   ACCEPTED/REJECTED/IN_PROGRESS/COMPLETED -> customer
//   CANCELLED                            -> the OTHER party
const notifyStatusChange = async (
  booking: {
    id: string;
    trade: string;
    customerId: string;
    customer: { name: string; email: string } | null;
    professionalId: string | null;
    professional: { userId: string | null; name: string | null } | null;
    priceInPence?: number | null;
    bookingDate?: Date | null;
    timeSlot?: string | null;
  },
  status: string,
  ctx: {
    requesterId: string;
    customerId: string;
    proUserId: string | null;
    previousStatus: string;
  }
) => {
  const proUserId = ctx.proUserId ?? (await getProfessionalUserId(booking.professionalId));

  // Duplicate protection: a no-op status update (e.g. COMPLETED -> COMPLETED)
  // must not re-fire notifications or emails.
  if (status === ctx.previousStatus) return;

  const map: Record<string, { type: string; title: string; body: string; recipient: "customer" | "provider" }> = {
    ACCEPTED: {
      type: "BOOKING_CONFIRMATION",
      title: "Booking accepted",
      body: `Your ${booking.trade} booking has been accepted.`,
      recipient: "customer",
    },
    REJECTED: {
      type: "BOOKING_REJECTED",
      title: "Booking rejected",
      body: `Your ${booking.trade} booking request was not accepted.`,
      recipient: "customer",
    },
    IN_PROGRESS: {
      type: "BOOKING_IN_PROGRESS",
      title: "Work in progress",
      body: `The professional has started your ${booking.trade} job.`,
      recipient: "customer",
    },
    COMPLETED: {
      type: "BOOKING_COMPLETED",
      title: "Your service has been completed 🎉",
      body: "Your LocalHero service has been successfully completed. We would love to hear about your experience. Please take a moment to leave your valuable review and rating.",
      recipient: "customer",
    },
    CANCELLED: {
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: `A ${booking.trade} booking has been cancelled.`,
      recipient: ctx.requesterId === ctx.customerId ? "provider" : "customer",
    },
  };

  const spec = map[status];
  if (!spec) return;

  const userId =
    spec.recipient === "customer" ? booking.customerId : proUserId;

  if (userId) {
    void NotificationService.create({
      userId,
      type: spec.type,
      title: spec.title,
      body: spec.body,
      data:
        status === "COMPLETED"
          ? { bookingId: booking.id, action: "LEAVE_REVIEW" }
          : { bookingId: booking.id },
    }).catch(() => undefined);
  }

  // Transactional email for the affected party.
  const emailFields = {
    trade: booking.trade,
    bookingDate: booking.bookingDate ? booking.bookingDate.toDateString() : "",
    timeSlot: booking.timeSlot ?? "",
    priceInPence: booking.priceInPence ?? undefined,
  };

  if (status === "ACCEPTED") {
    if (booking.customer?.email) {
      void sendTransactionalEmail("BOOKING_CONFIRMED", booking.customer.email, {
        customerName: booking.customer.name,
        ...emailFields,
      });
    }
  } else if (status === "REJECTED") {
    if (booking.customer?.email) {
      void sendTransactionalEmail("BOOKING_REJECTED", booking.customer.email, {
        customerName: booking.customer.name,
        ...emailFields,
      });
    }
  } else if (status === "IN_PROGRESS") {
    if (booking.customer?.email) {
      void sendTransactionalEmail("BOOKING_IN_PROGRESS", booking.customer.email, {
        customerName: booking.customer.name,
        ...emailFields,
      });
    }
  } else if (status === "COMPLETED") {
    if (booking.customer?.email) {
      void sendBookingCompletedReviewEmail(
        booking.customer.email,
        booking.customer.name,
        booking.id,
        booking.trade
      );
    }
  } else if (status === "CANCELLED") {
    if (spec.recipient === "customer") {
      if (booking.customer?.email) {
        void sendTransactionalEmail("BOOKING_CANCELLED", booking.customer.email, {
          name: booking.customer.name,
          role: "customer",
          ...emailFields,
        });
      }
    } else if (proUserId) {
      const providerUser = await prisma.user.findUnique({
        where: { id: proUserId },
        select: { email: true, name: true },
      });
      if (providerUser?.email) {
        void sendTransactionalEmail("BOOKING_CANCELLED", providerUser.email, {
          name: providerUser.name,
          role: "provider",
          ...emailFields,
        });
      }
    }
  }
};

const assignProfessional = async (id: string, professionalId: string, adminId: string) => {
  const [booking, professional] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, userId: true },
    }),
  ]);

  if (!booking) throw new AppError(404, "Booking not found");
  if (!professional) throw new AppError(404, "Professional not found");

  const updated = await prisma.booking.update({
    where: { id },
    data: { professionalId, status: "ACCEPTED" },
    include: bookingInclude,
  });

  // Assignment accepts the booking -> the customer gets the same
  // confirmation notification + email as a normal ACCEPTED transition.
  await notifyStatusChange(
    updated,
    "ACCEPTED",
    {
      requesterId: adminId,
      customerId: updated.customerId,
      proUserId: professional.userId,
      previousStatus: booking.status,
    }
  );

  return updated;
};

export const BookingService = {
  create,
  getMyBookings,
  getProviderBookings,
  getAll,
  getById,
  updateStatus,
  assignProfessional,
};
