import { Router } from "express";
import { UploadController } from "./upload.controller";
import authGuard from "../../middlewares/authGuard";
import upload from "../../middlewares/multer";

const router = Router();


router.post(
  "/image",
  authGuard,
  upload.single("image"),
  UploadController.uploadSingle
);


router.post(
  "/images",
  authGuard,
  upload.array("images", 10),
  UploadController.uploadMultiple
);

router.delete("/", authGuard, UploadController.deleteImage);

export const UploadRoutes = router;
