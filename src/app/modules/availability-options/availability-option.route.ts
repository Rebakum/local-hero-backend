import { Router } from "express";
import { AvailabilityOptionController } from "./availability-option.controller";

const router = Router();

// 1. Get All Availability Options (public)
router.get("/", AvailabilityOptionController.getAll);

export const AvailabilityOptionRoutes = router;
