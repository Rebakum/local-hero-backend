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

router.get("/", ProfessionalController.getAll);

router.get("/:id", ProfessionalController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateProfessionalValidation),
  ProfessionalController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateProfessionalValidation),
  ProfessionalController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetProfessionalValidation),
  ProfessionalController.deleteProfessional
);

export const ProfessionalRoutes = router;
