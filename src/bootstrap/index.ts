
import bcrypt from "bcrypt";
import { ApprovalStatus, Role } from "@prisma/client";

import app from "../app";
import config from "../config";
import prisma from "../config/prisma";
import { initSocket } from "../app/socket";

export const seedSuperAdmin = async (): Promise<void> => {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("⚠️ DATABASE_URL is missing. Skipping Super Admin seed.");
      return;
    }

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
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    console.warn(
      "⚠️ Could not seed Super Admin:",
      message
    );
  }
};

;
