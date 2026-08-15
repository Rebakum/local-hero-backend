/**
 * CLEANUP (NOT SEEDING) — identifies and removes ONLY the temporary E2E
 * records created by this project's E2E harnesses.
 *
 * Identifiers:
 *   - E2E users created by the harnesses all use the Gmail plus-tag pattern
 *     rebakpi+e2e...@gmail.com  (rebakpi+e2ecust-*, rebakpi+e2ecust2-*,
 *     rebakpi+e2eprov-*, rebakpi+e2ecomp-*, rebakpi+e2ecomp-p-*).
 *
 * Mode: "inspect" lists everything without deleting; "cleanup" deletes and
 * verifies. No seed command, no reset, no truncation is ever run.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const mode = process.argv[2] || "inspect";

const E2E_EMAIL_PREFIX = "rebakpi+e2e";

async function collect() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: E2E_EMAIL_PREFIX } },
    select: { id: true, email: true },
  });
  const userIds = users.map((u) => u.id);

  const professionals = userIds.length
    ? await prisma.professional.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, name: true },
      })
    : [];
  const proIds = professionals.map((p) => p.id);

  const bookings = userIds.length
    ? await prisma.booking.findMany({
        where: { customerId: { in: userIds } },
        select: { id: true, customerId: true, professionalId: true, status: true },
      })
    : [];
  const bookingIds = bookings.map((b) => b.id);

  const testimonials = userIds.length
    ? await prisma.testimonial.findMany({
        where: { OR: [{ userId: { in: userIds } }, { bookingId: { in: bookingIds } }] },
        select: { id: true, userId: true, bookingId: true, author: true },
      })
    : [];
  const testimonialIds = testimonials.map((t) => t.id);

  const notifications = userIds.length
    ? await prisma.notification.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, type: true },
      })
    : [];

  const sessions = userIds.length
    ? await prisma.session.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      })
    : [];

  const payments = bookingIds.length
    ? await prisma.payment.findMany({
        where: { bookingId: { in: bookingIds } },
        select: { id: true, bookingId: true, status: true },
      })
    : [];

  const savedPros = proIds.length
    ? await prisma.savedProfessional.findMany({
        where: { professionalId: { in: proIds } },
        select: { id: true, professionalId: true },
      })
    : [];

  const subscriptions = proIds.length
    ? await prisma.providerSubscription.findMany({
        where: { professionalId: { in: proIds } },
        select: { id: true, professionalId: true },
      })
    : [];

  const conversations = bookingIds.length
    ? await prisma.conversation.findMany({
        where: { bookingId: { in: bookingIds } },
        select: { id: true, bookingId: true },
      })
    : [];
  const convIds = conversations.map((c) => c.id);

  const messages = convIds.length
    ? await prisma.message.findMany({
        where: { conversationId: { in: convIds } },
        select: { id: true, conversationId: true },
      })
    : [];

  const applications = userIds.length
    ? await prisma.providerApplication.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      })
    : [];

  return {
    users,
    professionals,
    bookings,
    testimonials,
    notifications,
    sessions,
    payments,
    savedPros,
    subscriptions,
    conversations,
    messages,
    applications,
  };
}

function counts(c) {
  return {
    users: c.users.length,
    professionals: c.professionals.length,
    bookings: c.bookings.length,
    testimonials: c.testimonials.length,
    notifications: c.notifications.length,
    sessions: c.sessions.length,
    payments: c.payments.length,
    savedPros: c.savedPros.length,
    subscriptions: c.subscriptions.length,
    conversations: c.conversations.length,
    messages: c.messages.length,
    applications: c.applications.length,
  };
}

async function main() {
  const c = await collect();
  const cnt = counts(c);

  console.log("=== E2E RECORD IDENTIFICATION (email prefix: rebakpi+e2e*) ===");
  console.log(JSON.stringify(cnt, null, 2));

  if (c.users.length === 0) {
    console.log("\nNo E2E records found. Nothing to do.");
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log("\n--- users ---");
  c.users.forEach((u) => console.log("  ", u.id, u.email));

  if (mode === "inspect") {
    console.log("\nINSPECT MODE: nothing deleted. Run with 'cleanup' to delete.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // ---- DELETE (children first) ----
  if (c.messages.length) await prisma.message.deleteMany({ where: { id: { in: c.messages.map((m) => m.id) } } });
  if (c.conversations.length) await prisma.conversation.deleteMany({ where: { id: { in: c.conversations.map((x) => x.id) } } });
  if (c.payments.length) await prisma.payment.deleteMany({ where: { id: { in: c.payments.map((p) => p.id) } } });
  if (c.notifications.length) await prisma.notification.deleteMany({ where: { id: { in: c.notifications.map((n) => n.id) } } });
  if (c.testimonials.length) await prisma.testimonial.deleteMany({ where: { id: { in: c.testimonials.map((t) => t.id) } } });
  if (c.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: c.bookings.map((b) => b.id) } } });
  if (c.savedPros.length) await prisma.savedProfessional.deleteMany({ where: { id: { in: c.savedPros.map((s) => s.id) } } });
  if (c.subscriptions.length) await prisma.providerSubscription.deleteMany({ where: { id: { in: c.subscriptions.map((s) => s.id) } } });
  if (c.applications.length) await prisma.providerApplication.deleteMany({ where: { id: { in: c.applications.map((a) => a.id) } } });
  if (c.professionals.length) await prisma.professional.deleteMany({ where: { id: { in: c.professionals.map((p) => p.id) } } });
  if (c.users.length) await prisma.user.deleteMany({ where: { id: { in: c.users.map((u) => u.id) } } });

  // ---- VERIFY ----
  const after = await collect();
  const afterCnt = counts(after);
  console.log("\n=== AFTER CLEANUP ===");
  console.log(JSON.stringify(afterCnt, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("cleanup error:", err.message);
  await prisma.$disconnect();
  process.exit(2);
});
