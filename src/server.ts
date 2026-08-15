import { Server } from "http";
import app from "./app";
import config from "./config";
import { initSocket } from "./app/socket";
import { PrismaClient, Role, ApprovalStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const port = config.port;

let server: Server;

// Super Admin Auto-Create Function
const seedSuperAdmin = async (): Promise<void> => {
  try {
    const adminEmail = process.env.ENVIRONMENT_VARIABLE_SUPER_ADMIN_EMAIL;
    const adminPassword = process.env.ENVIRONMENT_VARIABLE_SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("⚠️ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing in .env");
      return;
    }

    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    
    if (existingAdmin) {
      console.log("ℹ️ Super Admin account already created!");
      return;
    }

   
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    console.log(`Super Admin created successfully: ${newAdmin.email}`);
  } catch (error) {
    console.error("❌ Error auto-creating Super Admin:", error);
  }
};

const startServer = async (): Promise<void> => {
  server = app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${config.nodeEnv}`);

    // Real-time layer (Socket.IO) for instant messaging & notifications.
    initSocket(server);

    await seedSuperAdmin();
  });
};

startServer();

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      await prisma.$disconnect();
      process.exit(0);
    });
  } else {
    process.exit(1);
  }
};

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