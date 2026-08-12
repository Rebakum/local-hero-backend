import { Router } from "express";
import { ProfessionController } from "./profession.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateProfessionValidation,
  UpdateProfessionValidation,
  GetProfessionValidation,
  GetAllProfessionsQueryValidation,
} from "./profession.interface";

const router = Router();

// 1. Get All Professions
router.get(
  "/",
  validateRequest(GetAllProfessionsQueryValidation),
  ProfessionController.getAll
);

// 2. Get Single Profession
router.get(
  "/:id",
  validateRequest(GetProfessionValidation),
  ProfessionController.getById
);

// 3. Create Profession (Admin & Super Admin)
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateProfessionValidation),
  ProfessionController.create
);

// 4. Update Profession (Admin & Super Admin)
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateProfessionValidation),
  ProfessionController.update
);

// 5. Delete Profession (Admin & Super Admin)
router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetProfessionValidation),
  ProfessionController.deleteProfession
);

export const ProfessionRoutes = router;
