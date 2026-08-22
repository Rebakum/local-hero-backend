import prisma from "../../../config/prisma";
import AppError from "../../utils/AppError";
import { Role } from "@prisma/client";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  approvalStatus: true,
  createdAt: true,
} as const;

interface IGetPendingUsersQuery {
  role?: string;
  approvalStatus?: string;
  page?: string;
  limit?: string;
}

// Real system-health check. Each entry is derived from an actual probe —
// never hardcoded "99.9%" style numbers.
const getSystemHealth = async () => {
  const dbStart = Date.now();
  let database: {
    status: "operational" | "degraded";
    latencyMs: number | null;
  } = { status: "degraded", latencyMs: null };

  try {
    // Ping the database with a bounded timeout.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database ping timed out")),
          5000
        )
      ),
    ]);
    database = {
      status: "operational",
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    database = { status: "degraded", latencyMs: null };
  }

  const authStart = Date.now();
  let authService: {
    status: "operational" | "degraded";
    latencyMs: number | null;
  } = { status: "degraded", latencyMs: null };

  try {
    // Auth lives in this API process and depends on the database — probe the
    // user table the same way a login/register flow would.
    await Promise.race([
      prisma.user.count({ take: 1 }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Auth probe timed out")),
          5000
        )
      ),
    ]);
    authService = {
      status: "operational",
      latencyMs: Date.now() - authStart,
    };
  } catch {
    authService = { status: "degraded", latencyMs: null };
  }

  // Payment gateway is external (Stripe). We can't hardcode an uptime, so
  // report whether it is configured and reachable at all.
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  let paymentGateway: { status: "operational" | "not_configured" };
  if (stripeConfigured) {
    try {
      // A lightweight live reachability probe against the Stripe API.
      const res = await fetch("https://api.stripe.com/v1", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      paymentGateway = { status: res.ok ? "operational" : "not_configured" };
    } catch {
      paymentGateway = { status: "not_configured" };
    }
  } else {
    paymentGateway = { status: "not_configured" };
  }

  const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

  return {
    platform: {
      status: "operational",
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb,
    },
    database,
    authService,
    paymentGateway,
  };
};

const getPendingUsers = async (query: IGetPendingUsersQuery) => {
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.approvalStatus) {
    where.approvalStatus = query.approvalStatus;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: { page, limit, total },
  };
};

const approveUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.approvalStatus !== "PENDING") {
    throw new AppError(400, "User is not pending approval");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "APPROVED",
      role: "ADMIN",
    },
    select: userSelect,
  });

  return updated;
};

const rejectUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.approvalStatus !== "PENDING") {
    throw new AppError(400, "User is not pending approval");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "REJECTED",
      role: "user",
    },
    select: userSelect,
  });

  return updated;
};

const changeUserRole = async (userId: string, role: Role) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const allowedRoles: Role[] = ["user", "serviceProvider", "ADMIN"];

  if (!allowedRoles.includes(role)) {
    throw new AppError(400, "Invalid role. Allowed: user, serviceProvider, ADMIN");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: userSelect,
  });

  return updated;
};

export const SuperAdminService = {
  getPendingUsers,
  approveUser,
  rejectUser,
  changeUserRole,
  getSystemHealth,
};
