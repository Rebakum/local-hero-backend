import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { Role } from "@prisma/client";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  createdAt: true,
} as const;

interface IGetPendingUsersQuery {
  role?: string;
  approvalStatus?: string;
  page?: string;
  limit?: string;
}

const getPendingUsers = async (query: IGetPendingUsersQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

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
      role: "ADMIN",
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

const changeUserRole = async (userId: string, role: Role) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const allowedRoles: Role[] = ["user", "serviceProvider", "ADMIN"];

  if (!allowedRoles.includes(role)) {
    throw new AppError(400, "Invalid role. Allowed: user, serviceProvider, ADMIN");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: userSelect,
  });

  return updated;
};

export const SuperAdminService = {
  getPendingUsers,
  approveUser,
  rejectUser,
  changeUserRole,
};
