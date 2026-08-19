import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { ITrade } from "./trade.interface";
import { TGetTradesQuery } from "./trade.validation";
import type { Prisma } from "@prisma/client";

type SortableTrade = ITrade;

const parseRate = (value: string): number => {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : Number.MAX_SAFE_INTEGER;
};

// Active featured services to embed with every trade response.
const featuredServicesInclude = {
  featuredServices: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
};

const sortTrades = (trades: SortableTrade[], sortBy: string): SortableTrade[] => {
  const list = [...trades];

  switch (sortBy) {
    case "name-asc":
      list.sort((a, b) => {
        const ta = (a.featuredServices?.[0]?.title as string | undefined) ?? a.category;
        const tb = (b.featuredServices?.[0]?.title as string | undefined) ?? b.category;
        return ta.localeCompare(tb);
      });
      break;
    case "name-desc":
      list.sort((a, b) => {
        const ta = (a.featuredServices?.[0]?.title as string | undefined) ?? a.category;
        const tb = (b.featuredServices?.[0]?.title as string | undefined) ?? b.category;
        return tb.localeCompare(ta);
      });
      break;
    case "popular":
      list.sort((a, b) => b.activeProsCount - a.activeProsCount);
      break;
    case "price-asc":
      list.sort((a, b) => parseRate(a.avgHourlyRate) - parseRate(b.avgHourlyRate));
      break;
    case "price-desc":
      list.sort((a, b) => parseRate(b.avgHourlyRate) - parseRate(a.avgHourlyRate));
      break;
    default:
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      break;
  }

  return list;
};

const getAll = async (query: TGetTradesQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.category) {
    where.category = query.category;
  }

  const trades = await prisma.trade.findMany({
    where,
    include: featuredServicesInclude,
    orderBy: { sortOrder: "asc" },
  });

  let result = trades as unknown as SortableTrade[];

  const search = query.search?.trim().toLowerCase();
  if (search) {
    result = result.filter((trade) => {
      const haystack = [
        trade.category,
        trade.subtitle,
        trade.description,
        ...(trade.popularTasks ?? []),
        ...(trade.featuredServices ?? []).flatMap((fs) => [
          fs.title,
          fs.description,
          ...(fs.popularFor ?? []),
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  result = sortTrades(result, query.sortBy || "featured");

  const total = result.length;

  return {
    trades: result.slice(skip, skip + limit),
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: featuredServicesInclude,
  });

  if (!trade) {
    throw new AppError(404, "Trade not found");
  }

  return trade;
};

// activeProsCount + any leftover legacy JSON is server-managed — never accepted
// from the client.
const stripServerManagedFields = (data: Record<string, unknown>) => {
  const payload = { ...data };
  delete payload.activeProsCount;
  delete payload.featuredService;
  return payload;
};

// Recalculate Trade.activeProsCount for a given tradeId. "Active" means a
// Professional row exists for that tradeId (professionals are only created
// when a ProviderApplication is approved). Must be called with the same
// transaction client when invoked inside a transaction.
export const recalculateActiveProsCount = async (
  tradeId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const count = await client.professional.count({ where: { tradeId } });
  await client.trade.update({
    where: { id: tradeId },
    data: { activeProsCount: count },
  });
  return count;
};

const create = async (data: Record<string, unknown>) => {
  const trade = await prisma.trade.create({
    data: stripServerManagedFields(data) as any,
  });

  return trade;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.trade.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Trade not found");
  }

  const trade = await prisma.trade.update({
    where: { id },
    data: stripServerManagedFields(data) as any,
  });

  return trade;
};

const deleteTrade = async (id: string) => {
  const existing = await prisma.trade.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Trade not found");
  }

  const [professionalCount, bookingCount, quoteCount, applicationCount] = await Promise.all([
    prisma.professional.count({ where: { tradeId: id } }),
    prisma.booking.count({ where: { tradeId: id } }),
    prisma.quote.count({ where: { tradeId: id } }),
    prisma.providerApplication.count({ where: { tradeId: id } }),
  ]);

  const linkedCount = professionalCount + bookingCount + quoteCount + applicationCount;

  if (linkedCount > 0) {
    throw new AppError(
      409,
      `Cannot delete this trade — ${professionalCount} professional(s), ${bookingCount} booking(s), ${quoteCount} quote(s), and ${applicationCount} provider application(s) are still linked to it. Remove or reassign them first.`
    );
  }

  await prisma.trade.delete({ where: { id } });
};

export const TradeService = {
  getAll,
  getById,
  create,
  update,
  deleteTrade,
};
