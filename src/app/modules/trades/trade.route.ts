import { Router } from "express";
import { TradeController } from "./trade.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { TradeValidation } from "./trade.validation";

const router = Router();

// 1. Get All Trades
router.get(
  "/",
  validateRequest(TradeValidation.getAllTradesQueryValidation),
  TradeController.getAll
);

// 2. Get Single Trade by ID (Validation Added)
router.get(
  "/:id",
  validateRequest(TradeValidation.getTradeValidation),
  TradeController.getById
);

// 3. Create Trade (Admin & Super Admin)
router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(TradeValidation.createTradeValidation),
  TradeController.create
);

// 4. Update Trade (Admin & Super Admin)
router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(TradeValidation.updateTradeValidation),
  TradeController.update
);

// 5. Delete Trade (Admin & Super Admin)
router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(TradeValidation.getTradeValidation),
  TradeController.deleteTrade
);

export const TradeRoutes = router;