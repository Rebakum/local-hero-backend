import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { resolveTradeRelations } from "../../utils/tradeResolver";
import { IGetAllProfessionalsQuery } from "./professional.interface";

const getAll = async (query: IGetAllProfessionalsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  if (query.featured === "true") {
    where.isFeatured = true;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { companyName: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.location) {
    where.location = { contains: query.location, mode: "insensitive" };
  }

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.professional.count({ where }),
  ]);

  return {
    professionals,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const professional = await prisma.professional.findUnique({
    where: { id },
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  return professional;
};

const create = async (data: Record<string, unknown>) => {
  const { tradeId, professionId, trade } = await resolveTradeRelations(
    data.trade as string
  );

  const professional = await prisma.professional.create({
    data: {
      ...(data as any),
      tradeId,
      professionId,
      trade,
    },
  });

  return professional;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.professional.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Professional not found");
  }

  const payload = { ...(data as any) };

  if (payload.trade) {
    const resolved = await resolveTradeRelations(payload.trade);
    payload.tradeId = resolved.tradeId;
    payload.professionId = resolved.professionId;
    payload.trade = resolved.trade;
  } else {
    // Keep the existing relations when the trade string is not being changed.
    delete payload.tradeId;
    delete payload.professionId;
  }

  const professional = await prisma.professional.update({
    where: { id },
    data: payload,
  });

  return professional;
};

const deleteProfessional = async (id: string) => {
  const existing = await prisma.professional.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Professional not found");
  }

  await prisma.professional.delete({ where: { id } });
};

export const ProfessionalService = {
  getAll,
  getById,
  create,
  update,
  deleteProfessional,
};
