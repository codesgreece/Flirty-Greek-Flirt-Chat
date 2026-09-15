import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { prisma } from "@/server/db";
import { sha256 } from "@/lib/crypto";
import { sendChatMessage, setPresence, setTyping, markConversationRead } from "@/server/messaging/service";

export function attachRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/ws",
    cors: { origin: false },
  });

  io.use(async (socket, next) => {
    const cookie = socket.handshake.headers.cookie ?? "";
    const match = cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith("flirty_session="));
    const token = match?.slice("flirty_session=".length);
    if (!token) return next(new Error("unauthenticated"));
    const session = await prisma.deviceSession.findUnique({
      where: { tokenHash: sha256(decodeURIComponent(token)) },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return next(new Error("unauthenticated"));
    socket.data.userId = session.userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    await setPresence(userId, true);
    socket.broadcast.emit("user:online", { userId });

    socket.on("conversation:join", async (conversationId: string) => {
      const convo = await prisma.conversation.findFirst({
        where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
      });
      if (!convo) return;
      socket.join(`convo:${conversationId}`);
    });

    socket.on("message:send", async (payload: { conversationId: string; body: string; clientId: string }) => {
      try {
        const message = await sendChatMessage({ senderId: userId, ...payload });
        io.to(`convo:${payload.conversationId}`).emit("message:new", message);
      } catch {
        socket.emit("message:error", { clientId: payload.clientId });
      }
    });

    socket.on("typing:start", async (conversationId: string) => {
      await setTyping(conversationId, userId, true);
      socket.to(`convo:${conversationId}`).emit("typing:start", { userId, conversationId });
    });
    socket.on("typing:stop", async (conversationId: string) => {
      await setTyping(conversationId, userId, false);
      socket.to(`convo:${conversationId}`).emit("typing:stop", { userId, conversationId });
    });
    socket.on("message:read", async (conversationId: string) => {
      await markConversationRead(userId, conversationId);
      socket.to(`convo:${conversationId}`).emit("message:read", { userId, conversationId });
    });

    socket.on("disconnect", async () => {
      await setPresence(userId, false);
      socket.broadcast.emit("user:offline", { userId });
    });
  });

  return io;
}
