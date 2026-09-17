-- CreateEnum
CREATE TYPE "CallState" AS ENUM ('IDLE', 'CALLING', 'RINGING', 'CONNECTED', 'ENDED', 'DECLINED', 'MISSED');

-- AlterEnum
ALTER TYPE "MessageKind" ADD VALUE 'PHOTO';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "typingAAt" TIMESTAMP(3),
ADD COLUMN     "typingBAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "replyToId" UUID,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "mediaKey" TEXT,
ADD COLUMN     "mediaThumbKey" TEXT,
ADD COLUMN     "mediaMime" TEXT,
ADD COLUMN     "mediaWidth" INTEGER,
ADD COLUMN     "mediaHeight" INTEGER;

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ChatActivity" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "userAMessaged" BOOLEAN NOT NULL DEFAULT false,
    "userBMessaged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatStreak" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastQualifiedDay" DATE,
    "callUnlockedAt" TIMESTAMP(3),

    CONSTRAINT "ChatStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSession" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "callerId" UUID NOT NULL,
    "calleeId" UUID NOT NULL,
    "state" "CallState" NOT NULL DEFAULT 'CALLING',
    "signaling" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringingAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatActivity_conversationId_day_key" ON "ChatActivity"("conversationId", "day");

-- CreateIndex
CREATE INDEX "ChatActivity_conversationId_day_idx" ON "ChatActivity"("conversationId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ChatStreak_conversationId_key" ON "ChatStreak"("conversationId");

-- CreateIndex
CREATE INDEX "CallSession_conversationId_startedAt_idx" ON "CallSession"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "CallSession_calleeId_state_idx" ON "CallSession"("calleeId", "state");

-- CreateIndex
CREATE INDEX "CallSession_callerId_state_idx" ON "CallSession"("callerId", "state");

-- AddForeignKey
ALTER TABLE "ChatActivity" ADD CONSTRAINT "ChatActivity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatStreak" ADD CONSTRAINT "ChatStreak_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
