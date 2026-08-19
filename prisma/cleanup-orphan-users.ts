import dotenv from "dotenv";
import path from "path";

// Load the backend .env so DATABASE_URL is available to the Prisma client.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Only consider accounts stuck unverified for at least this long.
const OLDER_THAN_MS = 24 * 60 * 60 * 1000;

// A verification token is only "valid" if it exists and has not expired.
const isUsableToken = (o: {
  verificationToken: string | null;
  verificationExpiresAt: Date | null;
}): boolean =>
  !!o.verificationToken &&
  !!o.verificationExpiresAt &&
  o.verificationExpiresAt > new Date();

async function main(): Promise<void> {
  const shouldDelete = process.argv.includes("--delete");
  const cutoff = new Date(Date.now() - OLDER_THAN_MS);

  const allUnverified = await prisma.user.findMany({
    where: { emailVerified: false },
    select: {
      id: true,
      email: true,
      createdAt: true,
      verificationToken: true,
      verificationExpiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const orphans = allUnverified.filter(
    (u) => u.createdAt < cutoff && !isUsableToken(u)
  );

  console.log(
    `[cleanup] Orphan users (emailVerified=false, no usable token, older than ${OLDER_THAN_MS / (60 * 60 * 1000)}h): ${orphans.length}`
  );

  for (const o of orphans) {
    console.log(
      `  - ${o.email} (created ${o.createdAt.toISOString()}, token=${o.verificationToken ? "present-but-expired" : "missing"})`
    );
  }

  if (shouldDelete && orphans.length > 0) {
    const result = await prisma.user.deleteMany({
      where: { id: { in: orphans.map((o) => o.id) } },
    });
    console.log(`[cleanup] Deleted ${result.count} orphan user(s).`);
  } else if (!shouldDelete) {
    console.log("[cleanup] Dry run — pass --delete to actually remove these records.");
  }
}

main()
  .catch((error) => {
    console.error("[cleanup] Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());