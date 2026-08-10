import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../utils/AppError";
import {
  CloudinaryFolder,
  deleteFromCloudinary,
  uploadBufferToCloudinary,
  uploadManyBuffersToCloudinary,
} from "../../utils/cloudinaryUpload";

const ADMIN_ONLY_FOLDERS: CloudinaryFolder[] = ["before-after", "trades"];
const VALID_FOLDERS: CloudinaryFolder[] = [
  "avatars",
  "portfolios",
  "before-after",
  "trades",
];

const resolveFolder = (req: Request): CloudinaryFolder => {
  const folder = (req.body?.folder || req.query?.folder) as string | undefined;

  if (!folder || !VALID_FOLDERS.includes(folder as CloudinaryFolder)) {
    throw new AppError(
      400,
      `folder is required and must be one of: ${VALID_FOLDERS.join(", ")}`
    );
  }

  const isAdminOnly = ADMIN_ONLY_FOLDERS.includes(folder as CloudinaryFolder);
  const role = req.user?.role;

  if (isAdminOnly && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new AppError(
      403,
      `Only admins can upload images to the "${folder}" folder`
    );
  }

  return folder as CloudinaryFolder;
};

const uploadSingle = catchAsync(async (req: Request, res: Response) => {
  const folder = resolveFolder(req);

  if (!req.file) {
    throw new AppError(400, "No image file was provided (field name: image)");
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, folder);

  sendResponse(res, 201, "Image uploaded successfully", result);
});

const uploadMultiple = catchAsync(async (req: Request, res: Response) => {
  const folder = resolveFolder(req);

  const files = (req.files as Express.Multer.File[] | undefined) || [];

  if (files.length === 0) {
    throw new AppError(
      400,
      "No image files were provided (field name: images)"
    );
  }

  const results = await uploadManyBuffersToCloudinary(
    files.map((file) => file.buffer),
    folder
  );

  sendResponse(res, 201, "Images uploaded successfully", results);
});

const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.body as { publicId?: string };

  if (!publicId) {
    throw new AppError(400, "publicId is required");
  }

  // Only allow deleting images inside our own localhero/ folders, so this
  // endpoint can't be used to delete arbitrary Cloudinary assets.
  if (!publicId.startsWith("localhero/")) {
    throw new AppError(400, "Invalid publicId");
  }

  await deleteFromCloudinary(publicId);

  sendResponse(res, 200, "Image deleted successfully", null);
});

export const UploadController = {
  uploadSingle,
  uploadMultiple,
  deleteImage,
};
