import prisma from "../../../config/prisma";

const getAll = async () => {
  const options = await prisma.availabilityOption.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  });

  return options;
};

export const AvailabilityOptionService = {
  getAll,
};
