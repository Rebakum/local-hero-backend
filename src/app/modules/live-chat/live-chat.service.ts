import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { getIO } from "../../socket";
import { NotificationService } from "../notifications/notification.service";
import { generateAiReply, isAiConfigured, type AiChatMessage } from "./ai.service";
import { buildLocalHeroContext } from "./context-builder";
import type { CreateThreadInput, SendMessageInput } from "./live-chat.interface";

const includeThread = { messages: { orderBy: { createdAt: "asc" as const } } } as const;

const getThread = async (id: string) => {
  const thread = await prisma.supportChatThread.findUnique({ where: { id }, include: includeThread });
  if (!thread) throw new AppError(404, "Chat thread not found");
  return thread;
};


const createThread = async (input: CreateThreadInput, userId?: string) => {
  const sessionId = input.sessionId?.trim() || undefined;
  const thread = await prisma.supportChatThread.create({
    data: {
      id: sessionId ?? undefined,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      guestName: input.name?.trim() || null,
      guestEmail: input.email?.trim() || null,
      status: "AI_ACTIVE",
    },
  });
  if (input.body?.trim()) await sendMessage(thread.id, input.body, userId, userId ? "USER" : "GUEST");
  return getThread(thread.id);
};

/**
 * Send a message on a thread.
 *
 * - GUEST / USER messages trigger the AI assistant (when the thread is in
 *   AI_ACTIVE state).
 * - ADMIN messages are manual replies and never trigger the AI.
 * - Once a thread is PENDING_HUMAN or RESOLVED, the AI stops replying.
 */
const sendMessage = async (
  threadId: string,
  body: string,
  senderId?: string,
  senderRole: "GUEST" | "USER" | "AI" | "ADMIN" = "GUEST"
) => {
  if (!body?.trim()) throw new AppError(400, "Message body is required");
  const thread = await getThread(threadId);

  const message = await prisma.supportChatMessage.create({
    data: { threadId, body: body.trim(), senderId: senderId ?? null, senderRole },
  });
  await prisma.supportChatThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
  emitMessage(threadId, message);

  // AI assistant replies only to visitor messages while the thread is AI_ACTIVE.
  if (
    (senderRole === "USER" || senderRole === "GUEST") &&
    thread.status === "AI_ACTIVE" &&
    isAiConfigured()
  ) {
    await generateAndSendAiReply(threadId, thread.messages.length > 0 ? thread.messages : [message]);
  }

  return message;
};

/**
 * Build the conversation history for the AI provider from persisted messages,
 * then generate + persist + broadcast an AI reply.
 */
const generateAndSendAiReply = async (threadId: string, history: { senderRole: string; body: string }[]) => {
  const mapped: AiChatMessage[] = history
    .filter((m) => m.senderRole === "USER" || m.senderRole === "GUEST" || m.senderRole === "AI")
    .map((m) => ({
      role: m.senderRole === "AI" ? ("assistant" as const) : ("user" as const),
      content: m.body,
    }));

  const aiReply = await generateAiReply(mapped);

  const aiMessage = await prisma.supportChatMessage.create({
    data: { threadId, body: aiReply.text, senderRole: "AI" },
  });
  await prisma.supportChatThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
  emitMessage(threadId, aiMessage);

  // The AI itself detected it cannot answer (needsHuman) → hand off to a human.
  if (aiReply.needsHuman) {
    await requestHumanHandoff(threadId, aiReply.text);
  }
};

const emitMessage = (threadId: string, message: unknown) => {
  getIO()?.to(`chat:${threadId}`).emit("live-chat:new", { threadId, message });
};

/**
 * Human hand-off:
 * - Flips the thread to PENDING_HUMAN (AI stops auto-replying).
 * - Pushes a real-time notification + socket event to all admins.
 */
const requestHumanHandoff = async (threadId: string, lastAiText?: string) => {
  const thread = await getThread(threadId);
  if (thread.status !== "AI_ACTIVE") return thread;

  const updated = await prisma.supportChatThread.update({
    where: { id: threadId },
    data: { status: "PENDING_HUMAN" },
  });

  const preview = (lastAiText || thread.messages.at(-1)?.body || "A visitor requested a human.").slice(0, 120);

  // In-app + socket notification to every admin.
  await NotificationService.notifyAdmins({
    type: "GENERAL",
    title: "Live chat needs a human",
    body: `Hand-off requested: "${preview}"`,
    data: { threadId },
  });

  // Real-time update to admin dashboards monitoring live chat.
  getIO()?.emit("live-chat:handoff", { threadId, status: "PENDING_HUMAN" });

  return updated;
};

/** Admin closes / resolves the thread. */
const resolveThread = async (id: string) => {
  await getThread(id);
  return prisma.supportChatThread.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
};

/** Re-open a resolved thread back to AI_ACTIVE so the assistant takes over again. */
const reactivateAi = async (id: string) => {
  await getThread(id);
  return prisma.supportChatThread.update({
    where: { id },
    data: { status: "AI_ACTIVE", resolvedAt: null },
  });
};

const listThreads = async () =>
  prisma.supportChatThread.findMany({ include: includeThread, orderBy: { lastMessageAt: "desc" } });

const closeThread = async (id: string) => {
  await getThread(id);
  return prisma.supportChatThread.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
};

export const LiveChatService = {
  createThread,
  getThread,
  sendMessage,
  requestHumanHandoff,
  resolveThread,
  reactivateAi,
  listThreads,
  closeThread,
};

export { buildLocalHeroContext };