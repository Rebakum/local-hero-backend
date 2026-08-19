import { Router } from "express";
import { FeaturedServiceController } from "./featured-service.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { FeaturedServiceValidation } from "./featured-service.validation";

const router = Router();

// Public: get all (active) featured services, filterable by tradeId
router.get(
  "/",
  validateRequest(FeaturedServiceValidation.getAllFeaturedServicesQueryValidation),
  FeaturedServiceController.getAll
);

// Public: get one
router.get(
  "/:id",
  validateRequest(FeaturedServiceValidation.getFeaturedServiceValidation),
  FeaturedServiceController.getById
);

// Admin: create
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FeaturedServiceValidation.createFeaturedServiceValidation),
  FeaturedServiceController.create
);

// Admin: update
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FeaturedServiceValidation.updateFeaturedServiceValidation),
  FeaturedServiceController.update
);

// Admin: delete
router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(FeaturedServiceValidation.getFeaturedServiceValidation),
  FeaturedServiceController.deleteFeaturedService
);

export const FeaturedServiceRoutes = router;
