import { Router } from "express";
import { BookingController } from "./booking.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { BookingValidation } from "./booking.validation";

const router = Router();

// Customer creates a booking request
router.post(
  "/",
  authGuard,
  roleGuard("user"),
  validateRequest(BookingValidation.createBookingValidation),
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
  validateRequest(BookingValidation.getAllBookingsQueryValidation),
  BookingController.getAll
);

router.get(
  "/:id",
  authGuard,
  validateRequest(BookingValidation.getBookingValidation),
  BookingController.getById
);

router.patch(
  "/:id/status",
  authGuard,
  validateRequest(BookingValidation.updateBookingStatusValidation),
  BookingController.updateStatus
);

// Admin manually assigns a professional to an unassigned booking
router.patch(
  "/:id/assign",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(BookingValidation.assignProfessionalValidation),
  BookingController.assignProfessional
);

export const BookingRoutes = router;
