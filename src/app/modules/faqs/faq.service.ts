import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import {
  TCreateFaqPayload,
  TGetFaqsQuery,
  TUpdateFaqPayload,
} from "./faq.validation";


// caller may include hidden FAQs so the management screen can review them.
const getAll = async (query: TGetFaqsQuery, admin = false) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (admin) {
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }
  } else {
    where.isActive = true;
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.search) {
    where.OR = [
      { question: { contains: query.search, mode: "insensitive" } },
      { answer: { contains: query.search, mode: "insensitive" } },
      { category: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [faqs, total] = await Promise.all([
    prisma.faq.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.faq.count({ where }),
  ]);

  return {
    faqs,
    meta: { page, limit, total },
  };
};

const getById = async (id: string) => {
  const faq = await prisma.faq.findUnique({ where: { id } });

  // Never leak hidden FAQs through the public detail endpoint.
  if (!faq || !faq.isActive) {
    throw new AppError(404, "FAQ not found");
  }

  return faq;
};

const create = async (data: TCreateFaqPayload) => {
  return prisma.faq.create({
    data: {
      question: data.question,
      answer: data.answer,
      category: data.category ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
};

const update = async (id: string, data: TUpdateFaqPayload) => {
  const existing = await prisma.faq.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "FAQ not found");
  }

  return prisma.faq.update({
    where: { id },
    data: {
      ...(data.question !== undefined && { question: data.question }),
      ...(data.answer !== undefined && { answer: data.answer }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

const remove = async (id: string) => {
  const existing = await prisma.faq.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "FAQ not found");
  }

  await prisma.faq.delete({ where: { id } });
};

export const FaqService = {
  getAll,
  getById,
  create,
  update,
  remove,
};