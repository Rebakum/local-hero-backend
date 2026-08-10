import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllBookingsQuery } from "./booking.interface";

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
    },
  },
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  payment: true,
} as const;

// A customer books a service. If they picked a specific professional, we
// attach them right away; otherwise it stays unassigned until an admin (or
// the provider themselves, in a future iteration) picks it up.
const create = async (customerId: string, data: ICreateBookingInput) => {
  if (data.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: data.professionalId },
    });
    if (!professional) {
      throw new AppError(404, "Selected professional not found");
    }
  }

  const booking = await prisma.booking.create({
    data: {
      customerId,
      professionalId: data.professionalId,
      trade: data.trade,
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

const getAll = async (query: IGetAllBookingsQuery) => {
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

// Covers accept / reject / start / complete / cancel, all through one
// status transition endpoint so the state machine lives in one place.
const updateStatus = async (
  id: string,
  requester: { userId: string; role: string },
  data: { status: string; priceInPence?: number; professionalId?: string }
) => {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

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
    },
    include: bookingInclude,
  });

  return updated;
};

const assignProfessional = async (id: string, professionalId: string) => {
  const [booking, professional] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.professional.findUnique({ where: { id: professionalId } }),
  ]);

  if (!booking) throw new AppError(404, "Booking not found");
  if (!professional) throw new AppError(404, "Professional not found");

  return prisma.booking.update({
    where: { id },
    data: { professionalId, status: "ACCEPTED" },
    include: bookingInclude,
  });
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
