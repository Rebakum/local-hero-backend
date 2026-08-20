import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { TCreateTicketPayload } from "./support-ticket.validation";

const create = async (data: TCreateTicketPayload, userId?: string) => {
  return prisma.supportTicket.create({
    data: {
      userId: userId ?? null,
      name: data.name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      subject: data.subject.trim(),
      message: data.message.trim(),
    },
  });
};

const getMyTickets = async (userId: string) => {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

const getAll = async (query: { page?: string; limit?: string; status?: string }) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "10", 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    tickets,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const update = async (
  id: string,
  data: { status?: string; assignedTo?: string | null }
) => {
  const existing = await prisma.supportTicket.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Support ticket not found");
  }

  let resolvedAt: Date | null | undefined;

  if (data.status === "RESOLVED" || data.status === "CLOSED") {
    resolvedAt = new Date();
  } else if (data.status === "OPEN") {
    resolvedAt = null;
  }

  return prisma.supportTicket.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status as never } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    },
  });
};

export const SupportTicketService = {
  create,
  getMyTickets,
  getAll,
  update,
};
