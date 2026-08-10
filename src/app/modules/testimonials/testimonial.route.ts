import { Router } from "express";
import { TestimonialController } from "./testimonial.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateTestimonialValidation,
  UpdateTestimonialValidation,
  GetTestimonialValidation,
} from "./testimonial.interface";

const router = Router();

router.get("/", TestimonialController.getAll);

router.get("/:id", TestimonialController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateTestimonialValidation),
  TestimonialController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateTestimonialValidation),
  TestimonialController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetTestimonialValidation),
  TestimonialController.deleteTestimonial
);

export const TestimonialRoutes = router;
