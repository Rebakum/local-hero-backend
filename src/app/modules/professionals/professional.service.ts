import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
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
  const professional = await prisma.professional.create({
    data: data as any,
  });

  return professional;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.professional.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Professional not found");
  }

  const professional = await prisma.professional.update({
    where: { id },
    data: data as any,
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
