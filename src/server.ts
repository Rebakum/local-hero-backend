import { Server } from "http";
import app from "./app";
import { initSocket } from "./app/socket";
import config from "./config";
import prisma from "./config/prisma";
import { seedSuperAdmin } from "./bootstrap";

export const startServer = (): void => {
  const port = config.port;
  let server: Server;

  const gracefulShutdown = (signal: string): void => {
    console.log(`${signal} received. Starting graceful shutdown...`);

    if (!server) {
      process.exit(1);
      return;
    }

    server.close(async () => {
      console.log("HTTP server closed.");
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  server = app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${config.nodeEnv}`);

    initSocket(server);
    
    seedSuperAdmin().catch((error) => {
      console.error("Error seeding super admin:", error);
    });
  });

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("Unhandled Rejection detected:", reason);
    gracefulShutdown("unhandledRejection");
  });

  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception detected:", error);
    gracefulShutdown("uncaughtException");
  });
}

// Only run the long-lived HTTP server locally / on a normal Node host.
// On Vercel serverless, the default export (the Express app) is used instead.
if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;