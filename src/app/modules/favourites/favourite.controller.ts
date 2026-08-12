import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FavouriteService } from "./favourite.service";

const addFavourite = catchAsync(async (req: Request, res: Response) => {
  const { professionalId } = req.params;
  const result = await FavouriteService.addFavourite(
    req.user!.userId,
    professionalId
  );

  sendResponse(res, 201, "Professional added to favourites", result);
});

const removeFavourite = catchAsync(async (req: Request, res: Response) => {
  const { professionalId } = req.params;
  await FavouriteService.removeFavourite(req.user!.userId, professionalId);

  sendResponse(res, 200, "Professional removed from favourites", null);
});

const getMyFavourites = catchAsync(async (req: Request, res: Response) => {
  const result = await FavouriteService.getMyFavourites(req.user!.userId);

  sendResponse(res, 200, "Favourites retrieved successfully", result);
});

const isFavourite = catchAsync(async (req: Request, res: Response) => {
  const { professionalId } = req.params;
  const result = await FavouriteService.isFavourite(
    req.user!.userId,
    professionalId
  );

  sendResponse(res, 200, "Favourite status retrieved successfully", { isFavourite: result });
});

export const FavouriteController = {
  addFavourite,
  removeFavourite,
  getMyFavourites,
  isFavourite,
};
