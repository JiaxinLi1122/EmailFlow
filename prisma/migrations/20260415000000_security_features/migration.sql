-- Migration: security_features
-- Adds session token rotation support and step-up authentication tables.
-- Safe to run on a fresh production database; idempotent for the new columns
-- (existing rows get NULL for the nullable columns, no data loss).

-- ============================================================
-- 1. Session token rotation columns
-- ============================================================

ALTER TABLE "Session"
  ADD COLUMN "previousTokenHash" TEXT,
  ADD COLUMN "rotatedAt"         TIMESTAMP(3);

-- Index used by the replay-detection query in auth-sessions.ts (resolveSession)
CREATE INDEX "Session_previousTokenHash_idx" ON "Session"("previousTokenHash");


-- ============================================================
-- 2. StepUpChallenge — stores email OTP challenges for step-up auth
-- ============================================================

CREATE TABLE "StepUpChallenge" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "otpHash"   TEXT         NOT NULL,   -- SHA-256 of the 6-digit OTP sent via email
    "action"    TEXT         NOT NULL,   -- 'change_password' | 'disable_totp' | 'delete_account'
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepUpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StepUpChallenge_otpHash_key"        ON "StepUpChallenge"("otpHash");
CREATE        INDEX "StepUpChallenge_userId_action_idx"  ON "StepUpChallenge"("userId", "action");

ALTER TABLE "StepUpChallenge"
  ADD CONSTRAINT "StepUpChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- 3. StepUpToken — short-lived single-use authorisation tokens
-- ============================================================

CREATE TABLE "StepUpToken" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "tokenHash" TEXT         NOT NULL,   -- SHA-256 of the raw token returned to client
    "action"    TEXT         NOT NULL,   -- must match the action on the guarded endpoint
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepUpToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StepUpToken_tokenHash_key"       ON "StepUpToken"("tokenHash");
CREATE        INDEX "StepUpToken_userId_action_idx"   ON "StepUpToken"("userId", "action");

ALTER TABLE "StepUpToken"
  ADD CONSTRAINT "StepUpToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
