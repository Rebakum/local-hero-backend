import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllTradesQuery } from "./trade.interface";

const getAll = async (query: IGetAllTradesQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { category: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.trade.count({ where }),
  ]);

  return {
    trades,
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
