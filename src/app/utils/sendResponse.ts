import { Response } from "express";

interface TMeta {
  page?: number;
  limit?: number;
  total?: number;
}

interface IApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: TMeta;
}

const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: TMeta
): void => {
  const response: IApiResponse<T> = {
    success: statusCode < 400,
    statusCode,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};

export default sendResponse;
