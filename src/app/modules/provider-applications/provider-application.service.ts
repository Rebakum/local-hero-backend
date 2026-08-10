import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllProviderApplicationsQuery } from "./provider-application.interface";

const create = async (userId: string, data: Record<string, unknown>) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role !== "user") {
    throw new AppError(400, "Only regular users can submit provider applications");
  }

  const existingApplication = await prisma.providerApplication.findFirst({
    where: {
      userId,
      status: "PENDING",
    },
  });

  if (existingApplication) {
    throw new AppError(409, "You already have a pending provider application");
  }

  const application = await prisma.providerApplication.create({
    data: {
      userId,
      trade: data.trade as string,
      companyName: data.companyName as string,
      bio: data.bio as string,
      hourlyRate: data.hourlyRate as number,
      location: data.location as string,
      postcodeArea: data.postcodeArea as string,
      specialties: data.specialties as string[],
      experienceYears: data.experienceYears as number,
      phone: data.phone as string,
      avatar: (data.avatar as string) || null,
      portfolioImages: (data.portfolioImages as string[]) || [],
    },
  });

  return application;
};

const getMyApplication = async (userId: string) => {
  const application = await prisma.providerApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return application;
};

const updateMyApplication = async (
  userId: string,
  applicationId: string,
  data: Record<string, unknown>
) => {
  const application = await prisma.providerApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new AppError(404, "Provider application not found");
  }

  if (application.userId !== userId) {
    throw new AppError(403, "You can only update your own application");
  }

  if (application.status !== "PENDING") {
    throw new AppError(400, "You can only update pending applications");
  }

  const updated = await prisma.providerApplication.update({
    where: { id: applicationId },
    data: data as any,
  });

  return updated;
};

const getAll = async (query: IGetAllProviderApplicationsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { companyName: { contains: query.search, mode: "insensitive" } },
      { user: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  const [applications, total] = await Promise.all([
    prisma.providerApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.providerApplication.count({ where }),
  ]);

  return {
    applications,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const application = await prisma.providerApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError(404, "Provider application not found");
  }

  return application;
};

const approve = async (id: string, reviewerId: string) => {
  const application = await prisma.providerApplication.findUnique({
    where: { id },
  });

  if (!application) {
    throw new AppError(404, "Provider application not found");
  }

  if (application.status !== "PENDING") {
    throw new AppError(400, "Application is not pending approval");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.providerApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: application.userId },
      data: {
        role: "serviceProvider",
        phone: application.phone,
      },
    });

    const professional = await tx.professional.create({
      data: {
        userId: application.userId,
        name: (await tx.user.findUnique({ where: { id: application.userId } }))?.name || "",
        trade: application.trade,
        companyName: application.companyName,
        avatar: application.avatar,
        hourlyRate: application.hourlyRate,
        location: application.location,
        postcodeArea: application.postcodeArea,
        specialties: application.specialties,
        bio: application.bio,
        portfolioImages: application.portfolioImages,
        responseMinutes: 30,
        verifiedStatus: {
          dbsChecked: false,
          insured: false,
          insuranceAmount: "",
        },
      },
    });

    return { application: updatedApplication, professional };
  });

  return result;
};

const reject = async (id: string, reviewerId: string, rejectionReason: string) => {
  const application = await prisma.providerApplication.findUnique({
    where: { id },
  });

  if (!application) {
    throw new AppError(404, "Provider application not found");
  }

  if (application.status !== "PENDING") {
    throw new AppError(400, "Application is not pending approval");
  }

  const updated = await prisma.providerApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });

  return updated;
};

export const ProviderApplicationService = {
  create,
  getMyApplication,
  updateMyApplication,
  getAll,
  getById,
  approve,
  reject,
};
