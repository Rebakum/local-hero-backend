import { Router } from "express";
import { BookingController } from "./booking.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateBookingValidation,
  UpdateBookingStatusValidation,
  AssignProfessionalValidation,
  GetBookingValidation,
} from "./booking.interface";

const router = Router();

// Customer creates a booking request
router.post(
  "/",
  authGuard,
  roleGuard("user"),
  validateRequest(CreateBookingValidation),
  BookingController.create
);

// Customer: my own bookings
router.get("/me", authGuard, BookingController.getMyBookings);

// Provider: bookings assigned to my professional profile
router.get(
  "/provider/me",
  authGuard,
  roleGuard("serviceProvider"),
  BookingController.getProviderBookings
);

// Admin: list all bookings (paginated, filterable)
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  BookingController.getAll
);

router.get(
  "/:id",
  authGuard,
  validateRequest(GetBookingValidation),
  BookingController.getById
);

// Accept / reject / start / complete / cancel a booking, optionally
// attaching a quoted price (in pence) at the same time.
router.patch(
  "/:id/status",
  authGuard,
  validateRequest(UpdateBookingStatusValidation),
  BookingController.updateStatus
);

// Admin manually assigns a professional to an unassigned booking
router.patch(
  "/:id/assign",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(AssignProfessionalValidation),
  BookingController.assignProfessional
);

export const BookingRoutes = router;
