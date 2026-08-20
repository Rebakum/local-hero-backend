import { Router } from "express";
import { SupportTicketController } from "./support-ticket.controller";
import authGuard from "../../middlewares/authGuard";
import optionalAuth from "../../middlewares/optionalAuth";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { SupportTicketValidation } from "./support-ticket.validation";

const router = Router();

// Public contact form (logged-in users are auto-linked via optionalAuth).
router.post(
  "/",
  optionalAuth,
  validateRequest(SupportTicketValidation.createTicketValidation),
  SupportTicketController.create
);

// Authenticated user: my tickets.
router.get(
  "/me",
  authGuard,
  SupportTicketController.getMyTickets
);

// Admin: list all tickets.
router.get(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SupportTicketValidation.listTicketsQueryValidation),
  SupportTicketController.getAll
);

// Admin: update a ticket.
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(SupportTicketValidation.updateTicketValidation),
  SupportTicketController.update
);

export const SupportTicketRoutes = router;
