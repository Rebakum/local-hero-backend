-- ============================================================
-- AI-POWERED LIVE CHAT
-- - SupportChatThread.status default moves to 'AI_ACTIVE'
-- - Adds sessionId (frictionless guest session identifier)
-- - Adds resolvedAt (timestamp when a thread was resolved)
-- ============================================================

-- AlterTable
ALTER TABLE "SupportChatThread"
    ADD COLUMN "sessionId" TEXT,
    ADD COLUMN "resolvedAt" TIMESTAMP(3),
    ALTER COLUMN "status" SET DEFAULT 'AI_ACTIVE';

-- CreateIndex
CREATE INDEX "SupportChatThread_sessionId_idx" ON "SupportChatThread"("sessionId");