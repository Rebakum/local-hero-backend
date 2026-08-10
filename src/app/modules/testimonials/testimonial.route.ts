import { Router } from "express";
import { TestimonialController } from "./testimonial.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { TestimonialValidation } from "./testimonial.validation";

const router = Router();

// Public: Get all testimonials
router.get(
  "/",
  validateRequest(TestimonialValidation.getAllTestimonialsQueryValidation),
  TestimonialController.getAll
);

// Public: Get single testimonial by ID
router.get(
  "/:id",
  validateRequest(TestimonialValidation.getTestimonialValidation),
  TestimonialController.getById
);

// Authenticated users can create a testimonial
router.post(
  "/",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.createTestimonialValidation),
  TestimonialController.create
);

// User can update THEIR OWN, Admin/Super Admin can update ANY
router.patch(
  "/:id",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.updateTestimonialValidation),
  TestimonialController.update
);

// User can delete THEIR OWN, Admin/Super Admin can delete ANY
router.delete(
  "/:id",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.getTestimonialValidation),
  TestimonialController.deleteTestimonial
);

export const TestimonialRoutes = router;