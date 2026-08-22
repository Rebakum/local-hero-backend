import prisma from "../../../config/prisma";

/**
 * RAG-style context builder for the AI live-chat assistant.
 *
 * Builds a LocalHero-specific system prompt from live database records so the
 * model answers from real platform data (FAQs, trades, professions, plans)
 * instead of making things up. The result is cached for a SHORT time only
 * (2 minutes) so admin edits to FAQs / plans are reflected quickly.
 */

const CONTEXT_TTL_MS = 2 * 60 * 1000; // 2 minutes

let contextCache: { builtAt: number; prompt: string } | null = null;

const formatGBP = (pence: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);

const buildPrompt = async (): Promise<string> => {
  const [faqs, trades, professions, plans] = await Promise.all([
    prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { category: true, question: true, answer: true },
    }),
    prisma.trade.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        category: true,
        subtitle: true,
        description: true,
        avgHourlyRate: true,
        startingPrice: true,
        popularTasks: true,
      },
    }),
    prisma.profession.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, description: true, trade: { select: { category: true } } },
    }),
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        slug: true,
        description: true,
        priceInPence: true,
        interval: true,
        features: true,
      },
    }),
  ]);

  const faqLines = faqs.map(
    (f) => `- [${f.category ?? "General"}] Q: ${f.question}\n  A: ${f.answer}`
  );

  const tradeLines = trades.map((t) => {
    const tasks = t.popularTasks.length ? ` Popular tasks: ${t.popularTasks.join(", ")}.` : "";
    const price = t.startingPrice ? ` Starting from ${t.startingPrice}.` : "";
    return `- ${t.category}${t.subtitle ? ` (${t.subtitle})` : ""}: ${t.description} Rate: ${t.avgHourlyRate}.${price}${tasks}`;
  });

  const professionLines = professions.map(
    (p) =>
      `- ${p.name} (${p.trade?.category ?? "General"}): ${
        p.description ?? "No description"
      }`
  );

  const planLines = plans.map((p) => {
    const price =
      p.priceInPence <= 0
        ? "Free"
        : `${formatGBP(p.priceInPence)}/${p.interval === "YEARLY" ? "year" : "month"}`;
    const features = Array.isArray(p.features) && p.features.length ? ` Features: ${p.features.join(", ")}.` : "";
    return `- ${p.name} (slug: ${p.slug}): ${price}.${p.description ? ` ${p.description}.` : ""}${features}`;
  });

  return `You are the LocalHero support assistant. LocalHero is a UK home-services marketplace connecting homeowners with vetted local tradespeople (plumbers, electricians, cleaners, roofers, etc.).

Answer the user's question based ONLY on the information below. If the answer is not present in this information, do not guess or invent an answer. Instead reply in your JSON response with "needsHuman": true so a human team member can take over.

KNOWN FAQS:
${faqLines.join("\n") || "- (none)"}

TRADES & SERVICES:
${tradeLines.join("\n") || "- (none)"}

PROFESSIONS:
${professionLines.join("\n") || "- (none)"}

SUBSCRIPTION PLANS:
${planLines.join("\n") || "- (none)"}

Rules:
- Be concise, friendly, and helpful. Answer in the same language the user writes in.
- If the user asks about pricing for a specific plan, quote the exact price from SUBSCRIPTION PLANS.
- If a trade/service is listed, you may describe it from TRADES & SERVICES.
- Never invent prices, features, policies or facts not present above.
- When unsure, set "needsHuman": true.

You MUST respond with valid JSON only, in this exact shape:
{"reply": "your answer text", "needsHuman": true|false}`;
};

/**
 * Returns the assembled system prompt, refreshing the underlying data at most
 * once every CONTEXT_TTL_MS. Callers that need fresher data can pass
 * `force = true` (used when an admin has just changed content).
 */
export const buildLocalHeroContext = async (force = false): Promise<string> => {
  if (!force && contextCache && Date.now() - contextCache.builtAt < CONTEXT_TTL_MS) {
    return contextCache.prompt;
  }

  const prompt = await buildPrompt();
  contextCache = { builtAt: Date.now(), prompt };
  return prompt;
};