CREATE TABLE "SupportChatThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportChatThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportChatThread_userId_idx" ON "SupportChatThread"("userId");
CREATE INDEX "SupportChatThread_status_lastMessageAt_idx" ON "SupportChatThread"("status", "lastMessageAt");
CREATE INDEX "SupportChatMessage_threadId_createdAt_idx" ON "SupportChatMessage"("threadId", "createdAt");
ALTER TABLE "SupportChatMessage" ADD CONSTRAINT "SupportChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SupportChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
