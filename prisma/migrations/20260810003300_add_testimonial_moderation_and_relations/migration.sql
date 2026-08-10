-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'Homeowner',
ALTER COLUMN "source" SET DEFAULT 'PLATFORM';

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_bookingId_key" ON "Testimonial"("bookingId");

-- CreateIndex
CREATE INDEX "Testimonial_isApproved_isFeatured_idx" ON "Testimonial"("isApproved", "isFeatured");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
