import cloudinary from "../../config/cloudinary";
import AppError from "./AppError";

export interface IUploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export type CloudinaryFolder =
  | "avatars"
  | "portfolios"
  | "before-after"
  | "trades";

/**
 * Streams a single in-memory file buffer (from multer.memoryStorage) up to
 * Cloudinary. Never touches disk — the buffer is piped directly into
 * Cloudinary's upload_stream.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: CloudinaryFolder
): Promise<IUploadedImage> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `localhero/${folder}`,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(502, error?.message || "Image upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    stream.end(buffer);
  });
};

export const uploadManyBuffersToCloudinary = (
  buffers: Buffer[],
  folder: CloudinaryFolder
): Promise<IUploadedImage[]> => {
  return Promise.all(buffers.map((buffer) => uploadBufferToCloudinary(buffer, folder)));
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new AppError(502, "Failed to delete image from storage");
  }
};
