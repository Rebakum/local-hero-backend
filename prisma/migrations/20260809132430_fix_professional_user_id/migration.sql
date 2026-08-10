/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Professional` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BeforeAfterProject" ALTER COLUMN "beforeImage" DROP NOT NULL,
ALTER COLUMN "afterImage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "avatar" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Testimonial" ALTER COLUMN "avatar" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProviderApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "postcodeArea" TEXT NOT NULL,
    "specialties" TEXT[],
    "experienceYears" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "avatar" TEXT,
    "portfolioImages" TEXT[],
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderApplication" ADD CONSTRAINT "ProviderApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderApplication" ADD CONSTRAINT "ProviderApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
