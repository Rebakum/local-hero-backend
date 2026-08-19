import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { sendTransactionalEmail } from "../../utils/email";
import { NotificationService } from "../notifications/notification.service";
import { recalculateActiveProsCount } from "../trades/trade.service";
import { TGetProviderApplicationsQuery } from "./provider-application.validation";

// Fetch emails of every ADMIN / SUPER_ADMIN account.
const getAdminEmails = async (): Promise<string[]> => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });
  return admins.map((a) => a.email);
};

const resolveTradeAndProfession = async (
  tradeId: string,
  professionId: string
) => {
  const tradeRecord = await prisma.trade.findUnique({
    where: { id: tradeId },
  });
  if (!tradeRecord) {
    throw new AppError(404, "Trade not found");
  }

  const profession = await prisma.profession.findUnique({
    where: { id: professionId },
  });
  if (!profession) {
    throw new AppError(404, "Profession not found");
  }

  if (profession.tradeId !== tradeRecord.id) {
    throw new AppError(
      400,
      "Selected profession does not belong to the selected trade"
    );
  }

  return {
    tradeId: tradeRecord.id,
    professionId: profession.id,
    trade: tradeRecord.category,
  };
};

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

  const resolved = await resolveTradeAndProfession(
    data.tradeId as string,
    data.professionId as string
  );

  const application = await prisma.providerApplication.create({
    data: {
      userId,
      tradeId: resolved.tradeId,
      professionId: resolved.professionId,
      trade: resolved.trade,
      companyName: data.companyName as string,
      companyLogo: (data.companyLogo as string) || null,
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

  // New provider application -> all admins.
  void NotificationService.notifyAdmins({
    type: "PROVIDER_APPLICATION_SUBMITTED",
    title: "New provider application",
    body: `${data.companyName as string} applied to become a ${data.trade as string} provider.`,
    data: { applicationId: application.id },
  }).catch(() => undefined);

  // New provider application -> email all admins (critical operational event).
  const adminEmails = await getAdminEmails();
  for (const adminEmail of adminEmails) {
    void sendTransactionalEmail("PROVIDER_APPLICATION_SUBMITTED", adminEmail, {
      adminName: "Admin",
      companyName: data.companyName as string,
      trade: data.trade as string,
    });
  }

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

  const payload = { ...(data as any) };

  if (payload.tradeId || payload.professionId) {
    const resolved = await resolveTradeAndProfession(
      (payload.tradeId as string) ?? application.tradeId,
      (payload.professionId as string) ?? application.professionId
    );
    payload.tradeId = resolved.tradeId;
    payload.professionId = resolved.professionId;
    payload.trade = resolved.trade;
  } else {
    delete payload.tradeId;
    delete payload.professionId;
    delete payload.trade;
  }

  const updated = await prisma.providerApplication.update({
    where: { id: applicationId },
    data: payload,
  });

  return updated;
};

const getAll = async (query: TGetProviderApplicationsQuery) => {
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

  const applicant = await prisma.user.findUnique({
    where: { id: application.userId },
  });

  if (!applicant) {
    throw new AppError(404, "Applying user no longer exists");
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
        approvalStatus: "APPROVED",
        phone: application.phone,
      },
    });

    // Professional.userId is unique: a user who reapplies after a rejection
    // (or whose profile already exists) must get their profile refreshed,
    // not a duplicate-constraint error.
    const professionalData = {
      name: applicant.name,
      tradeId: application.tradeId,
      professionId: application.professionId,
      trade: application.trade,
      companyName: application.companyName,
      avatar: application.avatar,
      hourlyRate: application.hourlyRate,
      location: application.location,
      postcodeArea: application.postcodeArea,
      specialties: application.specialties,
      bio: application.bio,
      portfolioImages: application.portfolioImages,
    };

    const existingProfessional = await tx.professional.findUnique({
      where: { userId: application.userId },
    });

    const professional = existingProfessional
      ? await tx.professional.update({
          where: { userId: application.userId },
          data: professionalData,
        })
      : await tx.professional.create({
          data: {
            userId: application.userId,
            ...professionalData,
            responseMinutes: 30,
            verifiedStatus: {
              dbsChecked: false,
              insured: false,
              insuranceAmount: "",
            },
          },
        });

    // A Professional row now exists under this trade -> keep the stored
    // activeProsCount in sync (counted inside the same transaction).
    await recalculateActiveProsCount(application.tradeId, tx);

    return { application: updatedApplication, professional };
  });

  // Application approved -> notify the applicant.
  void NotificationService.create({
    userId: application.userId,
    type: "PROVIDER_APPLICATION_APPROVED",
    title: "Provider application approved",
    body: "Congratulations! Your business is now live on LocalHero.",
    data: { applicationId: id },
  }).catch(() => undefined);

  // Application approved -> email the applicant.
  if (applicant.email) {
    void sendTransactionalEmail("PROVIDER_APPROVED", applicant.email, {
      name: applicant.name,
      trade: application.trade,
    });
  }

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

  // Application rejected -> notify the applicant.
  void NotificationService.create({
    userId: application.userId,
    type: "PROVIDER_APPLICATION_REJECTED",
    title: "Provider application rejected",
    body: rejectionReason || "Your provider application was not approved.",
    data: { applicationId: id },
  }).catch(() => undefined);

  // Application rejected -> email the applicant.
  const applicant = await prisma.user.findUnique({
    where: { id: application.userId },
    select: { email: true, name: true },
  });
  if (applicant?.email) {
    void sendTransactionalEmail("PROVIDER_REJECTED", applicant.email, {
      name: applicant.name,
      trade: application.trade,
      reason: rejectionReason,
    });
  }

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
