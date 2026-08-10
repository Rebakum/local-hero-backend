import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllBeforeAfterQuery } from "./before-after.interface";

const getAll = async (query: IGetAllBeforeAfterQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.trade) {
    where.trade = query.trade;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.beforeAfterProject.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.beforeAfterProject.count({ where }),
  ]);

  return {
    projects,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const project = await prisma.beforeAfterProject.findUnique({
    where: { id },
  });

  if (!project) {
    throw new AppError(404, "Before/After project not found");
  }

  return project;
};

const create = async (data: Record<string, unknown>) => {
  const project = await prisma.beforeAfterProject.create({
    data: data as any,
  });

  return project;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.beforeAfterProject.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  const project = await prisma.beforeAfterProject.update({
    where: { id },
    data: data as any,
  });

  return project;
};

const deleteProject = async (id: string) => {
  const existing = await prisma.beforeAfterProject.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "Before/After project not found");
  }

  await prisma.beforeAfterProject.delete({ where: { id } });
};

export const BeforeAfterService = {
  getAll,
  getById,
  create,
  update,
  deleteProject,
};
