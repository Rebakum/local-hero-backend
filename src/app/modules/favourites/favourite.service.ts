import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";

const professionalSelect = {
  select: {
    id: true,
    name: true,
    companyName: true,
    trade: true,
    avatar: true,
    rating: true,
    reviewCount: true,
    hourlyRate: true,
    location: true,
    postcodeArea: true,
    isVerified: true,
    isFeatured: true,
  },
} as const;

const addFavourite = async (userId: string, professionalId: string) => {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
  });

  if (!professional) {
    throw new AppError(404, "Professional not found");
  }

  return prisma.savedProfessional.upsert({
    where: {
      userId_professionalId: { userId, professionalId },
    },
    create: { userId, professionalId },
    update: {},
    include: { professional: professionalSelect },
  });
};

const removeFavourite = async (userId: string, professionalId: string) => {
  const existing = await prisma.savedProfessional.findUnique({
    where: { userId_professionalId: { userId, professionalId } },
  });

  if (!existing) {
    throw new AppError(404, "Professional is not in your favourites");
  }

  await prisma.savedProfessional.delete({ where: { id: existing.id } });
};

const getMyFavourites = async (userId: string) => {
  return prisma.savedProfessional.findMany({
    where: { userId },
    include: { professional: professionalSelect },
    orderBy: { createdAt: "desc" },
  });
};

const isFavourite = async (userId: string, professionalId: string) => {
  const favourite = await prisma.savedProfessional.findUnique({
    where: { userId_professionalId: { userId, professionalId } },
  });

  return !!favourite;
};

export const FavouriteService = {
  addFavourite,
  removeFavourite,
  getMyFavourites,
  isFavourite,
};
