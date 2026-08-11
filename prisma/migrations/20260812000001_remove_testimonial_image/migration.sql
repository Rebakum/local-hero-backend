-- AlterTable
-- Remove the image/avatar column from Testimonial (image is uploaded
-- directly to Cloudinary, not stored on the testimonial record).
ALTER TABLE "Testimonial" DROP COLUMN "image";
