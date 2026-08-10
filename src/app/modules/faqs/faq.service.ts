import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { IGetAllFAQsQuery } from "./faq.interface";

const getAll = async (query: IGetAllFAQsQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.category) {
    where.category = query.category;
  }

  if (query.search) {
    where.OR = [
      { question: { contains: query.search, mode: "insensitive" } },
      { answer: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [faqs, total] = await Promise.all([
    prisma.fAQ.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.fAQ.count({ where }),
  ]);

  return {
    faqs,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const faq = await prisma.fAQ.findUnique({
    where: { id },
  });

  if (!faq) {
    throw new AppError(404, "FAQ not found");
  }

  return faq;
};

const create = async (data: Record<string, unknown>) => {
  const faq = await prisma.fAQ.create({
    data: data as any,
  });

  return faq;
};

const update = async (id: string, data: Record<string, unknown>) => {
  const existing = await prisma.fAQ.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "FAQ not found");
  }

  const faq = await prisma.fAQ.update({
    where: { id },
    data: data as any,
  });

  return faq;
};

const deleteFAQ = async (id: string) => {
  const existing = await prisma.fAQ.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "FAQ not found");
  }

  await prisma.fAQ.delete({ where: { id } });
};

export const FAQService = {
  getAll,
  getById,
  create,
  update,
  deleteFAQ,
};
