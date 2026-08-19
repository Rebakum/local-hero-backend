import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { resolveTradeRelations } from "../../utils/tradeResolver";
import {
  IGetAllProfessionsQuery,
} from "./profession.interface";

const getAll = async (query: IGetAllProfessionsQuery) => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.tradeId) {
    where.tradeId = query.tradeId;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [professions, total] = await Promise.all([
    prisma.profession.findMany({
      where,
      include: {
        trade: { select: { id: true, category: true } },
      },
      skip,
      take: limit,
      orderBy: [{ trade: { category: "asc" as const } }, { sortOrder: "asc" as const }],
    }),
    prisma.profession.count({ where }),
  ]);

  return {
    professions,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const getById = async (id: string) => {
  const profession = await prisma.profession.findUnique({
    where: { id },
    include: {
      trade: { select: { id: true, category: true } },
    },
  });

  if (!profession) {
    throw new AppError(404, "Profession not found");
  }

  return profession;
};

const create = async (data: Record<string, unknown>) => {
  let tradeId = data.tradeId as string | undefined;

  if (!tradeId && data.trade) {
    const resolved = await resolveTradeRelations(data.trade as string);
    tradeId = resolved.tradeId;
  }

  if (!tradeId) {
    throw new AppError(400, "tradeId or a trade category is required");
  }

  const existing = await prisma.profession.findUnique({
    where: { tradeId_name: { tradeId, name: data.name as string } },
  });

  if (existing) {
    throw new AppError(409, "A profession with this name already exists under this trade");
  }

  return prisma.profession.create({
    data: {
      tradeId,
      name: data.name as string,
      description: (data.description as string) || null,
      isActive: (data.isActive as boolean) ?? true,
      sortOrder: (data.sortOrder as number) ?? 0,
    },
    include: {
      trade: { select: { id: true, category: true } },
    },
  });
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.profession.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Profession not found");
  }

  const payload = { ...(data as any) };

  if (payload.trade && !payload.tradeId) {
    const resolved = await resolveTradeRelations(payload.trade);
    payload.tradeId = resolved.tradeId;
  }
  delete payload.trade;

  const updated = await prisma.profession.update({
    where: { id },
    data: payload,
    include: {
      trade: { select: { id: true, category: true } },
    },
  });

  return updated;
};

const deleteProfession = async (id: string) => {
  const existing = await prisma.profession.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Profession not found");
  }

  const [professionalCount, bookingCount, quoteCount, applicationCount] = await Promise.all([
    prisma.professional.count({ where: { professionId: id } }),
    prisma.booking.count({ where: { professionId: id } }),
    prisma.quote.count({ where: { professionId: id } }),
    prisma.providerApplication.count({ where: { professionId: id } }),
  ]);

  const linkedCount = professionalCount + bookingCount + quoteCount + applicationCount;

  if (linkedCount > 0) {
    throw new AppError(
      409,
      `Cannot delete this profession — ${professionalCount} professional(s), ${bookingCount} booking(s), ${quoteCount} quote(s), and ${applicationCount} provider application(s) are still linked to it. Remove or reassign them first.`
    );
  }

  await prisma.profession.delete({ where: { id } });
};

export const ProfessionService = {
  getAll,
  getById,
  create,
  update,
  deleteProfession,
};
