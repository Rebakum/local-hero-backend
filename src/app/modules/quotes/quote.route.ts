import { Router } from "express";
import { QuoteController } from "./quote.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { QuoteValidation } from "./quote.validation";

const router = Router();

// Customer: submit a quote request
router.post(
  "/",
  authGuard,
  roleGuard("user"),
  validateRequest(QuoteValidation.createQuoteValidation),
  QuoteController.createQuote
);

// Customer: my quote requests
router.get("/me", authGuard, roleGuard("user"), QuoteController.getMyQuotes);

// Provider: quotes open for bidding
router.get(
  "/available",
  authGuard,
  roleGuard("serviceProvider"),
  QuoteController.getAvailableQuotes
);

// Provider: quotes I responded to
router.get(
  "/provider",
  authGuard,
  roleGuard("serviceProvider"),
  QuoteController.getProviderQuotes
);

// Provider: respond with a quotation
router.post(
  "/:id/responses",
  authGuard,
  roleGuard("serviceProvider"),
  validateRequest(QuoteValidation.respondToQuoteValidation),
  QuoteController.respondToQuote
);

// Customer: accept/reject a quotation
router.patch(
  "/:id/responses/:responseId",
  authGuard,
  roleGuard("user"),
  validateRequest(QuoteValidation.updateQuoteResponseStatusValidation),
  QuoteController.updateResponseStatus
);

router.get(
  "/:id",
  authGuard,
  validateRequest(QuoteValidation.getQuoteValidation),
  QuoteController.getQuoteById
);

export const QuoteRoutes = router;
