import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { ITrade } from "./trade.interface";
import { TGetTradesQuery } from "./trade.validation";

type SortableTrade = ITrade;

const parseRate = (value: string): number => {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : Number.MAX_SAFE_INTEGER;
};

const sortTrades = (trades: SortableTrade[], sortBy: string): SortableTrade[] => {
  const list = [...trades];

  switch (sortBy) {
    case "name-asc":
      list.sort((a, b) => {
        const ta = (a.featuredService?.title as string) ?? a.category;
        const tb = (b.featuredService?.title as string) ?? b.category;
        return ta.localeCompare(tb);
      });
      break;
    case "name-desc":
      list.sort((a, b) => {
        const ta = (a.featuredService?.title as string) ?? a.category;
        const tb = (b.featuredService?.title as string) ?? b.category;
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
    orderBy: { sortOrder: "asc" },
  });

  let result = trades as SortableTrade[];

  const search = query.search?.trim().toLowerCase();
  if (search) {
    result = result.filter((trade) => {
      const fs = (trade.featuredService ?? {}) as Record<string, unknown>;
      const haystack = [
        trade.category,
        trade.subtitle,
        trade.description,
        ...(trade.popularTasks ?? []),
        fs.title,
        fs.description,
        fs.popularFor,
        ...((fs.included as string[]) ?? []),
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
  });

  if (!trade) {
    throw new AppError(404, "Trade not found");
  }

  return trade;
};

const create = async (data: Record<string, unknown>) => {
  const trade = await prisma.trade.create({
    data: data as any,
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
    data: data as any,
  });

  return trade;
};

const deleteTrade = async (id: string) => {
  const existing = await prisma.trade.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Trade not found");
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
