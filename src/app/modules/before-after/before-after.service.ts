import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { NotificationService } from "../notifications/notification.service";
import { sendTransactionalEmail } from "../../utils/email";
import {
  TCreateBeforeAfterPayload,
  TUpdateBeforeAfterPayload,
  TGetBeforeAfterQuery,
} from "./before-after.validation";

interface IRequester {
  userId: string;
  role: string;
}

// Resolve the Professional linked to a logged-in provider user.
const getProfessionalForUser = async (userId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { userId },
  });

  if (!professional) {
    throw new AppError(
      403,
      "No professional profile is linked to your account"
    );
  }

  return professional;
};

// Public listing — only APPROVED showcases by default.
// When `admin` is true the caller may filter by any status.
const getAll = async (query: TGetBeforeAfterQuery, admin = false) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (admin) {
    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }
  } else {
    where.status = "APPROVED";
  }

  if (query.professionalId) where.professionalId = query.professionalId;
  if (query.isFeatured === "true") where.isFeatured = true;
  if (query.trade) where.trade = query.trade;

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.beforeAfterProject.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            companyName: true,
            avatar: true,
            trade: true,
          },
        },
      },
    }),
    prisma.beforeAfterProject.count({ where }),
  ]);

  return {
    projects,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const project = await prisma.beforeAfterProject.findUnique({
    where: { id },
    include: {
      professional: {
        select: {
          id: true,
          name: true,
          companyName: true,
          avatar: true,
          trade: true,
        },
      },
    },
  });

  // Never leak pending/rejected showcases through the public detail endpoint.
  if (!project || project.status !== "APPROVED") {
    throw new AppError(404, "Before/After project not found");
  }

  return project;
};

const create = async (data: TCreateBeforeAfterPayload, userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
  });

  if (!booking) {
    throw new AppError(404, "Booking not found");
  }

  if (booking.professionalId !== professional.id) {
    throw new AppError(
      403,
      "You can only submit before/after for your own completed bookings"
    );
  }

  if (booking.status !== "COMPLETED") {
    throw new AppError(
      400,
      "You can only submit before/after for completed bookings"
    );
  }

  const existing = await prisma.beforeAfterProject.findUnique({
    where: { bookingId: data.bookingId },
  });

  if (existing) {
    throw new AppError(
      409,
      "A before/after showcase already exists for this booking"
    );
  }

  const project = await prisma.beforeAfterProject.create({
    data: {
      bookingId: data.bookingId,
      professionalId: professional.id,
      // Trusted fields auto-populated from the booking — never from the client.
      trade: booking.trade,
      title: `${booking.trade} job in ${booking.postcode}`,
      location: booking.postcode,
      beforeImage: data.beforeImage,
      afterImage: data.afterImage,
      description: data.description,
      cost: data.cost,
      completionDays: data.completionDays,
      status: "PENDING",
    },
  });

  // Tell the admins a new submission awaits review.
  void NotificationService.notifyAdmins({
    type: "GENERAL",
    title: "New before/after submission",
    body: `${professional.name} submitted a before/after showcase for review.`,
    data: { projectId: project.id },
  }).catch(() => undefined);

  return project;
};

const update = async (
  id: string,
  data: TUpdateBeforeAfterPayload,
  requester: IRequester
) => {
  const existing = await prisma.beforeAfterProject.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  const isAdmin =
    requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";

  if (!isAdmin) {
    const professional = await getProfessionalForUser(requester.userId);

    if (existing.professionalId !== professional.id) {
      throw new AppError(403, "You can only edit your own before/after submissions");
    }

    if (existing.status === "APPROVED") {
      throw new AppError(
        400,
        "Approved showcases are locked. Please contact an admin to make changes."
      );
    }
  }

  const allowed: Record<string, unknown> = {};
  if (data.title !== undefined) allowed.title = data.title;
  if (data.location !== undefined) allowed.location = data.location;
  if (data.beforeImage !== undefined) allowed.beforeImage = data.beforeImage;
  if (data.afterImage !== undefined) allowed.afterImage = data.afterImage;
  if (data.description !== undefined) allowed.description = data.description;
  if (data.cost !== undefined) allowed.cost = data.cost;
  if (data.completionDays !== undefined) allowed.completionDays = data.completionDays;

  // Editing a rejected submission counts as a resubmit — send it back to
  // the admin review queue.
  if (!isAdmin && existing.status === "REJECTED") {
    allowed.status = "PENDING";
    allowed.rejectionReason = null;
  }

  const project = await prisma.beforeAfterProject.update({
    where: { id },
    data: allowed,
  });

  return project;
};

const deleteProject = async (id: string, requester: IRequester) => {
  const existing = await prisma.beforeAfterProject.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  const isAdmin =
    requester.role === "ADMIN" || requester.role === "SUPER_ADMIN";

  if (!isAdmin) {
    const professional = await getProfessionalForUser(requester.userId);

    if (existing.professionalId !== professional.id) {
      throw new AppError(403, "You can only delete your own before/after submissions");
    }
  }

  await prisma.beforeAfterProject.delete({ where: { id } });
};

const updateStatus = async (
  id: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason: string | undefined
) => {
  const existing = await prisma.beforeAfterProject.findUnique({
    where: { id },
    include: {
      professional: { select: { userId: true, name: true } },
    },
  });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  const project = await prisma.beforeAfterProject.update({
    where: { id },
    data: {
      status,
      rejectionReason:
        status === "REJECTED" ? rejectionReason || null : null,
    },
  });

  const professionalUserId = existing.professional?.userId;
  if (!professionalUserId) return project;

  if (status === "APPROVED") {
    void NotificationService.create({
      userId: professionalUserId,
      type: "GENERAL",
      title: "Before/after showcase approved",
      body: "Your before/after showcase is now live on your profile.",
      data: { projectId: id },
    }).catch(() => undefined);

    const profUser = await prisma.user.findUnique({
      where: { id: professionalUserId },
      select: { email: true, name: true },
    });

    if (profUser?.email) {
      void sendTransactionalEmail("BEFORE_AFTER_APPROVED", profUser.email, {
        professionalName: profUser.name,
        trade: existing.trade,
      });
    }
  } else {
    void NotificationService.create({
      userId: professionalUserId,
      type: "GENERAL",
      title: "Before/after showcase not approved",
      body: rejectionReason
        ? `Your before/after submission was not approved: ${rejectionReason}`
        : "Please review your before/after submission and resubmit.",
      data: { projectId: id },
    }).catch(() => undefined);

    const profUser = await prisma.user.findUnique({
      where: { id: professionalUserId },
      select: { email: true, name: true },
    });

    if (profUser?.email) {
      void sendTransactionalEmail("BEFORE_AFTER_REJECTED", profUser.email, {
        professionalName: profUser.name,
        trade: existing.trade,
        reason: rejectionReason,
      });
    }
  }

  return project;
};

const toggleFeature = async (id: string) => {
  const existing = await prisma.beforeAfterProject.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  if (existing.status !== "APPROVED") {
    throw new AppError(
      400,
      "Only approved showcases can be featured on the homepage"
    );
  }

  const project = await prisma.beforeAfterProject.update({
    where: { id },
    data: { isFeatured: !existing.isFeatured },
  });

  return project;
};

// Completed bookings belonging to the provider that don't yet have a
// before/after submission — these are the only bookings they may submit for.
const getEligibleBookings = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const bookings = await prisma.booking.findMany({
    where: {
      professionalId: professional.id,
      status: "COMPLETED",
      beforeAfter: null,
    },
    select: {
      id: true,
      trade: true,
      postcode: true,
      address: true,
      bookingDate: true,
      fullName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
};

// The provider's own submissions across all statuses (so they can track
// PENDING / APPROVED / REJECTED and resubmit when needed).
const getMySubmissions = async (userId: string) => {
  const professional = await getProfessionalForUser(userId);

  const projects = await prisma.beforeAfterProject.findMany({
    where: { professionalId: professional.id },
    orderBy: { createdAt: "desc" },
  });

  return projects;
};

export const BeforeAfterService = {
  getAll,
  getById,
  create,
  update,
  deleteProject,
  updateStatus,
  toggleFeature,
  getEligibleBookings,
  getMySubmissions,
};
