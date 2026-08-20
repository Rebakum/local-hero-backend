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
  const now = new Date();

  // Month boundaries for revenue trend comparison.
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Rolling 7-day window for "this week" style counters.
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

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
    activeAdmins,
    weeklyUserGrowth,
    currentMonthRevenue,
    previousMonthRevenue,
    totalRevenue,
    bookingsToday,
    totalBookings,
    paidBookings,
    revenueThisWeek,
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
    // Active admins = APPROVED ADMIN + SUPER_ADMIN accounts.
    prisma.user.count({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        approvalStatus: "APPROVED",
      },
    }),
    // Users created in the last 7 days.
    prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    // Platform revenue (PAID payments) — current calendar month.
    prisma.payment.aggregate({
      _sum: { amountInPence: true },
      where: {
        status: "PAID",
        paidAt: { gte: startOfCurrentMonth, lt: startOfNextMonth },
      },
    }),
    // Platform revenue (PAID payments) — previous calendar month.
    prisma.payment.aggregate({
      _sum: { amountInPence: true },
      where: {
        status: "PAID",
        paidAt: { gte: startOfPrevMonth, lt: startOfCurrentMonth },
      },
    }),
    // All-time platform revenue (PAID payments).
    prisma.payment.aggregate({
      _sum: { amountInPence: true },
      where: { status: "PAID" },
    }),
    // Bookings created today.
    prisma.booking.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    }),
    prisma.booking.count(),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.aggregate({
      _sum: { amountInPence: true },
      where: { status: "PAID", paidAt: { gte: startOfWeek } },
    }),
  ]);

  const currentMonthRevenuePence = currentMonthRevenue._sum.amountInPence || 0;
  const previousMonthRevenuePence = previousMonthRevenue._sum.amountInPence || 0;
  const platformRevenuePence = totalRevenue._sum.amountInPence || 0;
  const revenueThisWeekPence = revenueThisWeek._sum.amountInPence || 0;

  // Revenue trend: % change between current and previous calendar month.
  // If the previous month had no revenue, avoid a division-by-zero: report
  // +100% growth when the current month has revenue, otherwise 0%.
  let revenueChange = 0;
  if (previousMonthRevenuePence > 0) {
    revenueChange =
      ((currentMonthRevenuePence - previousMonthRevenuePence) /
        previousMonthRevenuePence) *
      100;
  } else if (currentMonthRevenuePence > 0) {
    revenueChange = 100;
  }

  // System health — probe the database (the platform's core dependency).
  // No fake uptime numbers: healthy = 100%, otherwise the DB is reported
  // as unavailable.
  let systemHealth = 0;
  let systemStatus = "System unavailable";
  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
    systemHealth = 100;
    systemStatus = "All systems operational";
  } catch {
    systemHealth = 0;
    systemStatus = "Database unavailable";
  }

  // Paid conversion rate = share of bookings that were paid for.
  const conversionRate =
    totalBookings > 0 ? (paidBookings / totalBookings) * 100 : 0;

  return {
    platformRevenuePence,
    revenueChange,
    activeAdmins,
    pendingApprovals: pendingApplications,
    weeklyUserGrowth,
    systemHealth,
    systemStatus,
    dbHealthy,
    // Bookings / analytics used by the dashboard's lower sections.
    bookingsToday,
    revenueThisWeekPence,
    totalBookings,
    conversionRate,
    // Keep the existing shape for backward compatibility.
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
