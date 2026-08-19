import prisma from "../../config/prisma";

// Resolve the new Trade -> Profession -> Professional hierarchy relations from
// the legacy `trade` display string that the frontend still sends.
//
// The `trade` string is kept on the record for display/search compatibility
// while tradeId/professionId feed the proper relations ("keep both").
export const resolveTradeRelations = async (trade: string) => {
  const category = trade?.trim();

  if (!category) {
    throw new Error("Trade category is required");
  }

  let tradeRecord = await prisma.trade.findUnique({
    where: { category },
  });

  if (!tradeRecord) {
    tradeRecord = await prisma.trade.create({
      data: {
        category,
        description: `${category} services`,
        avgHourlyRate: "£40/hr",
        popularTasks: [],
        isActive: true,
        sortOrder: 999,
      },
    });
  }

  // Prefer a Profession whose name matches the trade itself (e.g. the
  // "Plumber" profession under the "Plumber" trade); fall back to any
  // active profession under that trade; create one as a last resort.
  let profession = await prisma.profession.findFirst({
    where: { tradeId: tradeRecord.id, name: category },
  });

  if (!profession) {
    profession = await prisma.profession.findFirst({
      where: { tradeId: tradeRecord.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (!profession) {
    profession = await prisma.profession.create({
      data: {
        tradeId: tradeRecord.id,
        name: category,
        description: `${category} professionals`,
        isActive: true,
        sortOrder: 0,
      },
    });
  }

  return {
    tradeId: tradeRecord.id,
    professionId: profession.id,
    trade: tradeRecord.category,
  };
};
