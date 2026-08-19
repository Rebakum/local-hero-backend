import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { TGetFeaturedServicesQuery } from "./featured-service.validation";

const getAll = async (query: TGetFeaturedServicesQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "50", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.tradeId) {
    where.tradeId = query.tradeId;
  }

  if (query.isActive === "true") {
    where.isActive = true;
  } else if (query.isActive === "false") {
    where.isActive = false;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { popularFor: { has: query.search } },
    ];
  }

  const [services, total] = await Promise.all([
    prisma.featuredService.findMany({
      where,
      include: {
        trade: {
          select: { id: true, category: true },
        },
      },
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.featuredService.count({ where }),
  ]);

  return {
    services,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const service = await prisma.featuredService.findUnique({
    where: { id },
    include: {
      trade: {
        select: { id: true, category: true },
      },
    },
  });

  if (!service) {
    throw new AppError(404, "Featured service not found");
  }

  return service;
};

const create = async (data: Record<string, unknown>) => {
  const trade = await prisma.trade.findUnique({
    where: { id: data.tradeId as string },
  });

  if (!trade) {
    throw new AppError(404, "Trade not found");
  }

  const service = await prisma.featuredService.create({
    data: data as any,
  });

  return service;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.featuredService.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Featured service not found");
  }

  if (data.tradeId) {
    const trade = await prisma.trade.findUnique({
      where: { id: data.tradeId as string },
    });
    if (!trade) {
      throw new AppError(404, "Trade not found");
    }
  }

  const service = await prisma.featuredService.update({
    where: { id },
    data: data as any,
  });

  return service;
};

const deleteFeaturedService = async (id: string) => {
  const existing = await prisma.featuredService.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Featured service not found");
  }

  await prisma.featuredService.delete({ where: { id } });
};

export const FeaturedServiceService = {
  getAll,
  getById,
  create,
  update,
  deleteFeaturedService,
};
