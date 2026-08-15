-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationExpiresAt" TIMESTAMP(3);

-- Grandfather in accounts created before email verification existed so
-- nobody is locked out. New registrations default to emailVerified = false.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
