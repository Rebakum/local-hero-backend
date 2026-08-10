import { Router } from "express";
import { BeforeAfterController } from "./before-after.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateBeforeAfterValidation,
  UpdateBeforeAfterValidation,
  GetBeforeAfterValidation,
} from "./before-after.interface";

const router = Router();

router.get("/", BeforeAfterController.getAll);

router.get("/:id", BeforeAfterController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateBeforeAfterValidation),
  BeforeAfterController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateBeforeAfterValidation),
  BeforeAfterController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetBeforeAfterValidation),
  BeforeAfterController.deleteProject
);

export const BeforeAfterRoutes = router;
