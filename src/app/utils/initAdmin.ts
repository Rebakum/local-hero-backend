import { ApprovalStatus, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const seedSuperAdmin = async (): Promise<void> => {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

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

    console.log(`✅ Super Admin created successfully: ${newAdmin.email}`);
  } catch (error) {
    console.error("❌ Error auto-creating Super Admin:", error);
  }
};