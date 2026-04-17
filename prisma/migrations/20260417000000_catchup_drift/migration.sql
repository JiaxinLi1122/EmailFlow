-- Catch-up migration: aligns migration history with real database state.
-- Every statement uses IF EXISTS / IF NOT EXISTS guards so it is safe to
-- run even if the DB is already ahead or behind on any individual item.
-- Apply with: prisma migrate resolve --applied 20260417000000_catchup_drift


-- ============================================================
-- 1. PasswordResetToken table (in DB and schema, not in history)
-- ============================================================

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "tokenHash" TEXT         NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
    ON "PasswordResetToken"("tokenHash");

ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;  -- NOT VALID skips scanning existing rows; safe for catch-up


-- ============================================================
-- 2. ErrorLog table (in DB and schema, not in history)
-- ============================================================

CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT,
    "action"    TEXT         NOT NULL,
    "error"     TEXT         NOT NULL,
    "stack"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErrorLog_action_createdAt_idx"
    ON "ErrorLog"("action", "createdAt" DESC);


-- ============================================================
-- 3. Email columns (in DB and schema, not in history)
-- ============================================================

ALTER TABLE "Email"
    ADD COLUMN IF NOT EXISTS "syncBatchId"      TEXT,
    ADD COLUMN IF NOT EXISTS "processingStatus" TEXT NOT NULL DEFAULT 'done';

CREATE INDEX IF NOT EXISTS "Email_userId_processingStatus_receivedAt_idx"
    ON "Email"("userId", "processingStatus", "receivedAt" DESC);

CREATE INDEX IF NOT EXISTS "Email_userId_syncBatchId_idx"
    ON "Email"("userId", "syncBatchId");


-- ============================================================
-- 4. User.isAdmin column (in DB and schema, not in history)
-- ============================================================

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- 5. MatterMemory indexes (created in history, not in real DB)
--    20260409130000 created them; real DB does not have them.
--    Drop here to keep shadow-DB replay result == real DB state.
-- ============================================================

DROP INDEX IF EXISTS "MatterMemory_userId_idx";
DROP INDEX IF EXISTS "MatterMemory_userId_topic_idx";


-- ============================================================
-- 6. Session: deviceFingerprint index (created in history, not in DB)
--    20260414130000 created it; real DB does not have it.
-- ============================================================

DROP INDEX IF EXISTS "Session_userId_deviceFingerprint_idx";


-- ============================================================
-- 7. Session.updatedAt: remove DB-level default
--    20260414120000 added DEFAULT CURRENT_TIMESTAMP; real DB
--    no longer has a default on this column (Prisma manages
--    @updatedAt at the ORM level, not via DB default).
-- ============================================================

ALTER TABLE "Session" ALTER COLUMN "updatedAt" DROP DEFAULT;
