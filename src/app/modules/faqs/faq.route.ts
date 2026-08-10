import { Router } from "express";
import { FAQController } from "./faq.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateFAQValidation,
  UpdateFAQValidation,
  GetFAQValidation,
} from "./faq.interface";

const router = Router();

router.get("/", FAQController.getAll);

router.get("/:id", FAQController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateFAQValidation),
  FAQController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateFAQValidation),
  FAQController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetFAQValidation),
  FAQController.deleteFAQ
);

export const FAQRoutes = router;
