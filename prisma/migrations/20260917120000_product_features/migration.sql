-- AlterEnum
ALTER TYPE "MessageKind" ADD VALUE IF NOT EXISTS 'GIF';
ALTER TYPE "MessageKind" ADD VALUE IF NOT EXISTS 'STICKER';
ALTER TYPE "MessageKind" ADD VALUE IF NOT EXISTS 'VOICE';
ALTER TYPE "MessageKind" ADD VALUE IF NOT EXISTS 'EPHEMERAL_PHOTO';

-- AlterTable Profile
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "bioEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "availability" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyVibeQuestion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyVibeAnswer" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyVibeAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "voiceIntroKey" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "voiceIntroMime" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "voiceIntroMs" INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "phoneE164" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "hideFromContacts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "smartPhotoOrder" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "slowDiscover" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProfilePhoto" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DatingPreference" ADD COLUMN IF NOT EXISTS "recentlyActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DatingPreference" ADD COLUMN IF NOT EXISTS "dealbreakers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "focusType" TEXT;
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "focusLabel" TEXT;
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "secondChanceShown" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "ephemeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;

CREATE TABLE IF NOT EXISTS "ProfileView" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "viewerId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecommendationSignal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Spotlight" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Spotlight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConsumableBalance" (
    "userId" UUID NOT NULL,
    "superLikes" INTEGER NOT NULL DEFAULT 0,
    "firstMessages" INTEGER NOT NULL DEFAULT 0,
    "boosts" INTEGER NOT NULL DEFAULT 0,
    "spotlights" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumableBalance_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "DateShare" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "otherName" TEXT NOT NULL,
    "whenText" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DateShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProfileView_subjectId_createdAt_idx" ON "ProfileView"("subjectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProfileView_viewerId_createdAt_idx" ON "ProfileView"("viewerId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationSignal_userId_createdAt_idx" ON "RecommendationSignal"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Spotlight_userId_status_expiresAt_idx" ON "Spotlight"("userId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "DateShare_userId_createdAt_idx" ON "DateShare"("userId", "createdAt");

ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationSignal" ADD CONSTRAINT "RecommendationSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Spotlight" ADD CONSTRAINT "Spotlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsumableBalance" ADD CONSTRAINT "ConsumableBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DateShare" ADD CONSTRAINT "DateShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
