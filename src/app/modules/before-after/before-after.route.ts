import { Router } from "express";
import { BeforeAfterController } from "./before-after.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { BeforeAfterValidation } from "./before-after.validation";

const router = Router();

// Public: only APPROVED showcases (homepage / professional profile).
router.get(
  "/",
  validateRequest(BeforeAfterValidation.getAllBeforeAfterQueryValidation),
  BeforeAfterController.getAll
);

// Admin: view all submissions, filterable by status (PENDING/APPROVED/REJECTED).
router.get(
  "/admin",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.getAllBeforeAfterQueryValidation),
  BeforeAfterController.getAllAdmin
);

// Provider: bookings they can submit a before/after for.
router.get(
  "/my/eligible-bookings",
  authGuard,
  roleGuard("serviceProvider"),
  BeforeAfterController.getEligibleBookings
);

// Provider: their own submissions (all statuses).
router.get(
  "/my/submissions",
  authGuard,
  roleGuard("serviceProvider"),
  BeforeAfterController.getMySubmissions
);

// Public: approved showcase detail.
router.get("/:id", BeforeAfterController.getById);

// Provider: submit a before/after for one of their OWN completed bookings.
router.post(
  "/",
  authGuard,
  roleGuard("serviceProvider"),
  validateRequest(BeforeAfterValidation.createBeforeAfterValidation),
  BeforeAfterController.create
);

// Provider (own PENDING/REJECTED) or Admin: update a submission.
router.patch(
  "/:id",
  authGuard,
  validateRequest(BeforeAfterValidation.updateBeforeAfterValidation),
  BeforeAfterController.update
);

// Admin: approve/reject a submission.
router.patch(
  "/:id/status",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.updateStatusValidation),
  BeforeAfterController.updateStatus
);

// Admin: toggle homepage feature (approved only).
router.patch(
  "/:id/feature",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BeforeAfterValidation.toggleFeatureValidation),
  BeforeAfterController.toggleFeature
);

// Provider (own) or Admin: delete a submission.
router.delete(
  "/:id",
  authGuard,
  validateRequest(BeforeAfterValidation.getBeforeAfterValidation),
  BeforeAfterController.deleteProject
);

export const BeforeAfterRoutes = router;
