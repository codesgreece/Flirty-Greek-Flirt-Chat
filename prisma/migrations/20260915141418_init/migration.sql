-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'NONBINARY', 'OTHER');

-- CreateEnum
CREATE TYPE "DatingIntention" AS ENUM ('CASUAL', 'DATING', 'RELATIONSHIP', 'MARRIAGE', 'FIGURING_IT_OUT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PLUS', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'TRIALING');

-- CreateEnum
CREATE TYPE "InteractionKind" AS ENUM ('LIKE', 'FLIRT', 'SUPER_LIKE', 'PASS');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'DIRECT_MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'SPAM', 'SCAM', 'INAPPROPRIATE', 'THREATS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationState" AS ENUM ('UPLOADED', 'PROCESSING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MODERATOR', 'SUPPORT', 'ANALYST');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('LIKE', 'FLIRT', 'SUPER_LIKE', 'DIRECT_MESSAGE', 'MATCH', 'MESSAGE', 'PROFILE_VIEW', 'VERIFICATION', 'SUBSCRIPTION', 'SAFETY');

-- CreateEnum
CREATE TYPE "VibeCode" AS ENUM ('CHILL', 'ROMANTIC', 'ADVENTUROUS', 'FUNNY', 'SOCIAL', 'DEEP', 'CREATIVE', 'AMBITIOUS', 'SPONTANEOUS');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "seeking" "Gender"[],
    "bio" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "datingIntention" "DatingIntention" NOT NULL DEFAULT 'DATING',
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "education" TEXT NOT NULL DEFAULT '',
    "heightCm" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lifestyle" JSONB NOT NULL DEFAULT '{}',
    "prompts" JSONB NOT NULL DEFAULT '[]',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "discoverable" BOOLEAN NOT NULL DEFAULT true,
    "incognito" BOOLEAN NOT NULL DEFAULT false,
    "showDistance" BOOLEAN NOT NULL DEFAULT true,
    "showOnline" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePhoto" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "mediumKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "ModerationState" NOT NULL DEFAULT 'UPLOADED',
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "userId" UUID NOT NULL,
    "interestId" UUID NOT NULL,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId","interestId")
);

-- CreateTable
CREATE TABLE "Vibe" (
    "id" UUID NOT NULL,
    "code" "VibeCode" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Vibe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVibe" (
    "userId" UUID NOT NULL,
    "vibeId" UUID NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "UserVibe_pkey" PRIMARY KEY ("userId","vibeId")
);

-- CreateTable
CREATE TABLE "DatingPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "minAge" INTEGER NOT NULL DEFAULT 18,
    "maxAge" INTEGER NOT NULL DEFAULT 45,
    "maxDistanceKm" INTEGER NOT NULL DEFAULT 50,
    "genders" "Gender"[],
    "intentions" "DatingIntention"[],
    "verifiedOnly" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotosOnly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DatingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "communicationStyle" TEXT NOT NULL DEFAULT '',
    "activityLevel" TEXT NOT NULL DEFAULT '',
    "lifestylePace" TEXT NOT NULL DEFAULT '',
    "relationshipPace" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CompatibilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityScore" (
    "id" UUID NOT NULL,
    "viewerId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "interests" INTEGER NOT NULL,
    "vibe" INTEGER NOT NULL,
    "intent" INTEGER NOT NULL,
    "lifestyle" INTEGER NOT NULL,
    "distance" INTEGER NOT NULL,
    "personality" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "kind" "InteractionKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rewindable" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "withSuperLike" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "lowUserId" UUID NOT NULL,
    "highUserId" UUID NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'FLIRT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unmatchedAt" TIMESTAMP(3),
    "unmatchedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "mutedByA" BOOLEAN NOT NULL DEFAULT false,
    "mutedByB" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "description" TEXT NOT NULL,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renews" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'development',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingLedger" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntitlement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'PLAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boost" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "Boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Passport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" UUID NOT NULL,
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reportedId" UUID NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "messageId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "selfieKey" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" UUID,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "likes" BOOLEAN NOT NULL DEFAULT true,
    "flirts" BOOLEAN NOT NULL DEFAULT true,
    "matches" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "profileVisibility" TEXT NOT NULL DEFAULT 'DISCOVERABLE',
    "showDistance" BOOLEAN NOT NULL DEFAULT true,
    "showOnline" BOOLEAN NOT NULL DEFAULT true,
    "discoveryVisible" BOOLEAN NOT NULL DEFAULT true,
    "messagePermissions" TEXT NOT NULL DEFAULT 'MATCHES',
    "cookieAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "cookieMarketing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ipHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "state" "ModerationState" NOT NULL DEFAULT 'MANUAL_REVIEW',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "adminId" UUID,
    "action" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MODERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiddenProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "hiddenId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitOverride" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "windowSec" INTEGER NOT NULL,

    CONSTRAINT "RateLimitOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "User_status_lastActiveAt_idx" ON "User"("status", "lastActiveAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_city_discoverable_idx" ON "Profile"("city", "discoverable");

-- CreateIndex
CREATE INDEX "Profile_verificationStatus_idx" ON "Profile"("verificationStatus");

-- CreateIndex
CREATE INDEX "Profile_incognito_discoverable_idx" ON "Profile"("incognito", "discoverable");

-- CreateIndex
CREATE INDEX "ProfilePhoto_profileId_sortOrder_idx" ON "ProfilePhoto"("profileId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProfilePhoto_status_idx" ON "ProfilePhoto"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_slug_key" ON "Interest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vibe_code_key" ON "Vibe"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DatingPreference_userId_key" ON "DatingPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityProfile_userId_key" ON "CompatibilityProfile"("userId");

-- CreateIndex
CREATE INDEX "CompatibilityScore_viewerId_score_idx" ON "CompatibilityScore"("viewerId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityScore_viewerId_subjectId_key" ON "CompatibilityScore"("viewerId", "subjectId");

-- CreateIndex
CREATE INDEX "Interaction_actorId_targetId_kind_active_idx" ON "Interaction"("actorId", "targetId", "kind", "active");

-- CreateIndex
CREATE INDEX "Interaction_targetId_kind_createdAt_idx" ON "Interaction"("targetId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Interaction_actorId_createdAt_idx" ON "Interaction"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessage_idempotencyKey_key" ON "DirectMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DirectMessage_recipientId_createdAt_idx" ON "DirectMessage"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_lowUserId_highUserId_active_key" ON "Match"("lowUserId", "highUserId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_matchId_key" ON "Conversation"("matchId");

-- CreateIndex
CREATE INDEX "Conversation_userAId_lastMessageAt_idx" ON "Conversation"("userAId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_userBId_lastMessageAt_idx" ON "Conversation"("userBId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_clientId_key" ON "Message"("conversationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_expiresAt_idx" ON "Subscription"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserEntitlement_userId_capability_key" ON "UserEntitlement"("userId", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_userId_key_periodKey_key" ON "UsageCounter"("userId", "key", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "Boost_idempotencyKey_key" ON "Boost"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Boost_userId_status_expiresAt_idx" ON "Boost"("userId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Passport_userId_key" ON "Passport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Verification_status_createdAt_idx" ON "Verification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_tokenHash_key" ON "DeviceSession"("tokenHash");

-- CreateIndex
CREATE INDEX "DeviceSession_userId_revokedAt_idx" ON "DeviceSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "DeviceSession_expiresAt_idx" ON "DeviceSession"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationCase_state_createdAt_idx" ON "ModerationCase"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_route_key_key" ON "IdempotencyKey"("userId", "route", "key");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenProfile_userId_hiddenId_key" ON "HiddenProfile"("userId", "hiddenId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitOverride_key_key" ON "RateLimitOverride"("key");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVibe" ADD CONSTRAINT "UserVibe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVibe" ADD CONSTRAINT "UserVibe_vibeId_fkey" FOREIGN KEY ("vibeId") REFERENCES "Vibe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatingPreference" ADD CONSTRAINT "DatingPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityProfile" ADD CONSTRAINT "CompatibilityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_lowUserId_fkey" FOREIGN KEY ("lowUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_highUserId_fkey" FOREIGN KEY ("highUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedger" ADD CONSTRAINT "BillingLedger_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passport" ADD CONSTRAINT "Passport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExport" ADD CONSTRAINT "DataExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
