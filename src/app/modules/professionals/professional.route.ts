import { Router } from "express";
import { ProfessionalController } from "./professional.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateProfessionalValidation,
  UpdateProfessionalValidation,
  GetProfessionalValidation,
} from "./professional.interface";

const router = Router();

// 1. Get All Professionals
router.get("/", ProfessionalController.getAll);

// 2. Get Single Professional (ADDED validateRequest)
router.get(
  "/:id",
  validateRequest(GetProfessionalValidation),
  ProfessionalController.getById
);

// 3. Create Professional
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateProfessionalValidation),
  ProfessionalController.create
);

// 4. Update Professional
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateProfessionalValidation),
  ProfessionalController.update
);

// 5. Delete Professional
router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetProfessionalValidation),
  ProfessionalController.deleteProfessional
);

export const ProfessionalRoutes = router;