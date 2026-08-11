import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import config from "./config";
import router from "./app/routes";

import notFound from "./app/middlewares/notFound";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";

import { PaymentController } from "./app/modules/payments/payment.controller";

const app: Application = express();

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);


app.post(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  PaymentController.webhook
);


app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());


app.use("/api/v1", router);


app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "LocalHero Backend API is running",
    version: "1.0.0",
  });
});

/**
 * 404
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(globalErrorHandler);

export default app;