import { Router } from "express";
import { TradeController } from "./trade.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import {
  CreateTradeValidation,
  UpdateTradeValidation,
  GetTradeValidation,
} from "./trade.interface";

const router = Router();

router.get("/", TradeController.getAll);

router.get("/:id", TradeController.getById);

router.post(
  "/",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(CreateTradeValidation),
  TradeController.create
);

router.patch(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(UpdateTradeValidation),
  TradeController.update
);

router.delete(
  "/:id",
  authGuard,
  roleGuard("ADMIN", "SUPER_ADMIN"),
  validateRequest(GetTradeValidation),
  TradeController.deleteTrade
);

export const TradeRoutes = router;
