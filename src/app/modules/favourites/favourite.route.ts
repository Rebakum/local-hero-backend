import { Router } from "express";
import { FavouriteController } from "./favourite.controller";
import authGuard from "../../middlewares/authGuard";
import roleGuard from "../../middlewares/roleGuard";
import validateRequest from "../../middlewares/validateRequest";
import { FavouriteValidation } from "./favourite.validation";

const router = Router();

router.get("/me", authGuard, roleGuard("user"), FavouriteController.getMyFavourites);

router.get(
  "/check/:professionalId",
  authGuard,
  roleGuard("user"),
  validateRequest(FavouriteValidation.professionalIdValidation),
  FavouriteController.isFavourite
);

router.post(
  "/:professionalId",
  authGuard,
  roleGuard("user"),
  validateRequest(FavouriteValidation.professionalIdValidation),
  FavouriteController.addFavourite
);

router.delete(
  "/:professionalId",
  authGuard,
  roleGuard("user"),
  validateRequest(FavouriteValidation.professionalIdValidation),
  FavouriteController.removeFavourite
);

export const FavouriteRoutes = router;
