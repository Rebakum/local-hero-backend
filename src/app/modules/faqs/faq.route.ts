import { Router } from "express";
import { FaqController } from "./faq.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { FaqValidation } from "./faq.validation";

const router = Router();

// Public: only active FAQs (homepage / FAQ page).
router.get(
  "/",
  validateRequest(FaqValidation.getAllFaqsQueryValidation),
  FaqController.getAll
);

// Admin: view all FAQs, including hidden ones, for management.
router.get(
  "/admin",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FaqValidation.getAllFaqsQueryValidation),
  FaqController.getAllAdmin
);

// Public: active FAQ detail.
router.get(
  "/:id",
  validateRequest(FaqValidation.getFaqValidation),
  FaqController.getById
);

// Admin: create a FAQ.
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FaqValidation.createFaqValidation),
  FaqController.create
);

// Admin: update a FAQ.
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FaqValidation.updateFaqValidation),
  FaqController.update
);

// Admin: delete a FAQ.
router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FaqValidation.getFaqValidation),
  FaqController.remove
);

export const FaqRoutes = router;