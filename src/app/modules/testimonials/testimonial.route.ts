import { Router } from "express";
import { TestimonialController } from "./testimonial.controller";
import authGuard from "../../middlewares/authGuard";
import optionalAuthGuard from "../../middlewares/optionalAuthGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { TestimonialValidation } from "./testimonial.validation";

const router = Router();


router.get(
  "/",
  optionalAuthGuard,
  validateRequest(TestimonialValidation.getAllTestimonialsQueryValidation),
  TestimonialController.getAll
);


// Logged-in user's own testimonials (dashboard edit/delete). Must be
// registered before "/:id" so it isn't captured by the id param route.
router.get(
  "/me",
  authGuard,
  TestimonialController.getMyTestimonials
);


router.get(
  "/:id",
  validateRequest(TestimonialValidation.getTestimonialValidation),
  TestimonialController.getById
);


router.post(
  "/",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.createTestimonialValidation),
  TestimonialController.create
);


router.patch(
  "/:id",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.updateTestimonialValidation),
  TestimonialController.update
);


router.delete(
  "/:id",
  authGuard,
  roleGuard("user", "serviceProvider", "ADMIN", "SUPER_ADMIN"),
  validateRequest(TestimonialValidation.getTestimonialValidation),
  TestimonialController.deleteTestimonial
);

export const TestimonialRoutes = router;