import bcrypt from "bcrypt";
import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import {
  IUpdateProfilePayload,
  IApplyProviderPayload,
  IDeleteProfilePayload,
  IProfileResponse,
  IGetAllUsersQuery,
} from "./user.interface";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  avatar: true,
  approvalStatus: true,
  category: true,
  experienceYears: true,
  serviceDetails: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getProfile = async (userId: string): Promise<IProfileResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

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
    meta: {
      page,
      limit,
      total,
    },
  };
};

const applyProvider = async (
  userId: string,
  payload: IApplyProviderPayload
): Promise<IProfileResponse> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role !== "user") {
    throw new AppError(400, "Only regular users can apply as service provider");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      category: payload.category,
      experienceYears: payload.experienceYears,
      serviceDetails: payload.serviceDetails,
      phone: payload.phone,
      role: "serviceProvider",
      approvalStatus: "PENDING",
    },
    select: userSelect,
  });

  return updated;
};

const deleteUser = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
};

const updateProfile = async (
  userId: string,
  payload: IUpdateProfilePayload
): Promise<IProfileResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: userSelect,
  });

  return updatedUser;
};

const deleteProfile = async (
  userId: string,
  payload: IDeleteProfilePayload
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid password");
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
};

export const UserService = {
  getProfile,
  getAllUsers,
  applyProvider,
  deleteUser,
  deleteProfile,
  updateProfile,
};
