import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { emitToUser } from "../../socket";
import { NotificationService } from "../notifications/notification.service";

const professionalSelect = {
  select: {
    id: true,
    name: true,
    companyName: true,
    trade: true,
    avatar: true,
    rating: true,
  },
} as const;

const customerSelect = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const conversationInclude = {
  professional: professionalSelect,
  customer: customerSelect,
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} as const;

// Resolve the professional id linked to a user account, if any.
const getProfessionalIdByUser = async (userId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { userId },
    select: { id: true },
  });
  return professional?.id ?? null;
};

const getOrCreateConversation = async (
  customerId: string,
  professionalId: string,
  bookingId?: string
) => {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      customerId,
      professionalId,
      ...(bookingId ? { bookingId } : { bookingId: null }),
    },
  });

  if (existing) {
    return prisma.conversation.findUnique({
      where: { id: existing.id },
      include: conversationInclude,
    });
  }

  return prisma.conversation.create({
    data: {
      customerId,
      professionalId,
      bookingId: bookingId ?? null,
    },
    include: conversationInclude,
  });
};

const getMyConversations = async (userId: string) => {
  const professionalId = await getProfessionalIdByUser(userId);

  const where = professionalId
    ? { OR: [{ customerId: userId }, { professionalId }] }
    : { customerId: userId };

  return prisma.conversation.findMany({
    where,
    include: conversationInclude,
    orderBy: { lastMessageAt: "desc" },
  });
};

const assertParticipant = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { professional: { select: { userId: true } } },
  });

  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }

  const professionalId = await getProfessionalIdByUser(userId);

  const isParticipant =
    conversation.customerId === userId ||
    (!!professionalId && conversation.professionalId === professionalId);

  if (!isParticipant) {
    throw new AppError(403, "You are not a participant of this conversation");
  }

  return conversation;
};

const getConversationById = async (conversationId: string, userId: string) => {
  await assertParticipant(conversationId, userId);

  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      professional: professionalSelect,
      customer: customerSelect,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

const sendMessage = async (
  conversationId: string,
  senderId: string,
  data: { body?: string; image?: string }
) => {
  const conversation = await assertParticipant(conversationId, senderId);

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      body: data.body?.trim() || null,
      image: data.image || null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Notify the other participant.
  const professional = await prisma.professional.findUnique({
    where: { id: conversation.professionalId },
    select: { userId: true },
  });

  const recipientId =
    senderId === conversation.customerId
      ? professional?.userId
      : conversation.customerId;

  if (recipientId && recipientId !== senderId) {
    await NotificationService.create({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: "New message",
      body: data.body?.trim() || "You received a new message",
      data: { conversationId, messageId: message.id },
    });
  }

  // Real-time delivery of the message to both participants (covers the
  // sender's other tabs too).
  const payload = { conversationId, message };
  emitToUser(senderId, "message:new", payload);
  if (recipientId) {
    emitToUser(recipientId, "message:new", payload);
  }

  return message;
};

const getMessages = async (conversationId: string, userId: string) => {
  await assertParticipant(conversationId, userId);

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

const markConversationRead = async (conversationId: string, userId: string) => {
  await assertParticipant(conversationId, userId);

  return prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, isRead: false },
    data: { isRead: true },
  });
};

export const MessagingService = {
  getOrCreateConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  getMessages,
  markConversationRead,
};
