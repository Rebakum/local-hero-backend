import { Router } from "express";
import { BeforeAfterController } from "./before-after.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { BeforeAfterValidation } from "./before-after.validation";

const router = Router();

router.get(
  "/",
  validateRequest(BeforeAfterValidation.getAllBeforeAfterQueryValidation),
  BeforeAfterController.getAll
);

router.get("/:id", BeforeAfterController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.createBeforeAfterValidation),
  BeforeAfterController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.updateBeforeAfterValidation),
  BeforeAfterController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.getBeforeAfterValidation),
  BeforeAfterController.deleteProject
);

export const BeforeAfterRoutes = router;
