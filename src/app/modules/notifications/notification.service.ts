import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { emitToUser } from "../../socket";

interface ICreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

const create = async (input: ICreateNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as never,
      title: input.title,
      body: input.body,
      data: (input.data as never) ?? undefined,
    },
  });

  // Push the notification to the user's open tabs in real time.
  emitToUser(input.userId, "notification:new", notification);

  return notification;
};

// Notify every ADMIN / SUPER_ADMIN account (e.g. new provider applications).
const notifyAdmins = async (
  input: Omit<ICreateNotificationInput, "userId">
) => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) => create({ ...input, userId: admin.id }))
  );
};

const getMyNotifications = async (
  userId: string,
  query: { page?: string; limit?: string; unread?: string }
) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };

  if (query.unread === "true") {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    throw new AppError(404, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(403, "You can only update your own notifications");
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const getUnreadCount = async (userId: string) => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

export const NotificationService = {
  create,
  notifyAdmins,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
