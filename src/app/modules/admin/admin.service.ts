import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllUsersQuery } from "./admin.interface";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  approvalStatus: true,
  category: true,
  experienceYears: true,
  serviceDetails: true,
  createdAt: true,
} as const;

const getAllUsers = async (query: IGetAllUsersQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.role) {
    where.role = query.role;
  }

  if (query.approvalStatus) {
    where.approvalStatus = query.approvalStatus;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: { page, limit, total },
  };
};

const approveUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.approvalStatus !== "PENDING") {
    throw new AppError(400, "User is not pending approval");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "APPROVED",
      role: "serviceProvider",
    },
    select: userSelect,
  });

  return updated;
};

const rejectUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.approvalStatus !== "PENDING") {
    throw new AppError(400, "User is not pending approval");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "REJECTED",
      role: "user",
    },
    select: userSelect,
  });

  return updated;
};

const deleteUser = async (userId: string, adminId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role === "SUPER_ADMIN") {
    throw new AppError(403, "Cannot delete SUPER_ADMIN users");
  }

  if (userId === adminId) {
    throw new AppError(403, "Cannot delete your own account");
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalProviders,
    totalProfessionals,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    totalTrades,
    totalTestimonials,
    totalFAQs,
    totalProjects,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "serviceProvider" } }),
    prisma.professional.count(),
    prisma.providerApplication.count({ where: { status: "PENDING" } }),
    prisma.providerApplication.count({ where: { status: "APPROVED" } }),
    prisma.providerApplication.count({ where: { status: "REJECTED" } }),
    prisma.trade.count(),
    prisma.testimonial.count(),
    prisma.fAQ.count(),
    prisma.beforeAfterProject.count(),
  ]);

  return {
    totalUsers,
    totalProviders,
    totalProfessionals,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    totalTrades,
    totalTestimonials,
    totalFAQs,
    totalProjects,
  };
};

export const AdminService = {
  getAllUsers,
  approveUser,
  rejectUser,
  deleteUser,
  getDashboardStats,
};
