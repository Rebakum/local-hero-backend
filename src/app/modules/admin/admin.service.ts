import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { NotificationService } from "../notifications/notification.service";
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

  // Only flips the approval status. Role changes are the Super Admin's
  // responsibility (/super-admin/users/:id/role) — approving a pending
  // user must never silently change their role.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "APPROVED",
    },
    select: userSelect,
  });

  void NotificationService.create({
    userId,
    type: "ACCOUNT_UPDATED",
    title: "Account approved",
    body: "Your account has been approved. You can now use LocalHero.",
  }).catch(() => undefined);

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

  // If the user applied as a provider (legacy apply-provider flow sets the
  // role to serviceProvider while still PENDING), a rejection reverts them
  // back to a regular user. Any other role is left untouched.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "REJECTED",
      ...(user.role === "serviceProvider" ? { role: "user" as const } : {}),
    },
    select: userSelect,
  });

  void NotificationService.create({
    userId,
    type: "ACCOUNT_UPDATED",
    title: "Account update",
    body: "Your account status has been updated by an administrator.",
  }).catch(() => undefined);

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
