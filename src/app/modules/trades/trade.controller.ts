import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TradeService } from "./trade.service";
import { IGetAllTradesQuery } from "./trade.interface";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await TradeService.getAll(
    req.query as IGetAllTradesQuery
  );

  sendResponse(
    res,
    200,
    "Trades retrieved successfully",
    result.trades,
    result.meta
  );
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TradeService.getById(id);

  sendResponse(res, 200, "Trade retrieved successfully", result);
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await TradeService.create(req.body);

  sendResponse(res, 201, "Trade created successfully", result);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TradeService.update(id, req.body);

  sendResponse(res, 200, "Trade updated successfully", result);
});

const deleteTrade = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await TradeService.deleteTrade(id);

  sendResponse(res, 200, "Trade deleted successfully", null);
});

export const TradeController = {
  getAll,
  getById,
  create,
  update,
  deleteTrade,
};
