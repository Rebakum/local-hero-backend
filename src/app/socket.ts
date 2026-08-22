import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import config from "../config";
import { Role } from "@prisma/client";

let io: Server | null = null;

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1) {
      cookies[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  return cookies;
};

const authenticate = (socket: Socket): string | null => {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token =
    cookies.accessToken ||
    (socket.handshake.auth?.token as string | undefined);

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded.userId;
  } catch {
    return null;
  }
};

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrls,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const userId = authenticate(socket);
    if (!userId && socket.handshake.auth?.guest !== true) {
      return next(new Error("Unauthorized"));
    }
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | null;
    if (userId) socket.join(`user:${userId}`);
    socket.on("live-chat:join", (threadId: string) => {
      if (typeof threadId === "string" && threadId.length < 80) {
        socket.join(`chat:${threadId}`);
      }
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

// Emit an event to every socket belonging to a user (all their tabs/devices).
export const emitToUser = (userId: string, event: string, data: unknown) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
};
