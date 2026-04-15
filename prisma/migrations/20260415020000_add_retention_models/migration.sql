-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'METADATA_ONLY', 'PURGED');

-- CreateEnum
CREATE TYPE "ProtectionRuleType" AS ENUM ('CONTACT', 'DOMAIN', 'LABEL');

-- AlterTable: add retention fields to Email (all nullable/defaulted for backward compat)
ALTER TABLE "Email"
  ADD COLUMN "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "archivedAt"      TIMESTAMP(3),
  ADD COLUMN "metadataOnlyAt"  TIMESTAMP(3),
  ADD COLUMN "purgedAt"        TIMESTAMP(3),
  ADD COLUMN "restorableUntil" TIMESTAMP(3),
  ADD COLUMN "retentionReason" TEXT;

-- CreateIndex: retention status lookup for the cleanup engine
CREATE INDEX "Email_userId_retentionStatus_receivedAt_idx"
  ON "Email"("userId", "retentionStatus", "receivedAt" DESC);

-- CreateTable: Attachment
CREATE TABLE "Attachment" (
    "id"                TEXT        NOT NULL,
    "emailId"           TEXT        NOT NULL,
    "filename"          TEXT        NOT NULL,
    "mimeType"          TEXT        NOT NULL DEFAULT '',
    "size"              INTEGER     NOT NULL DEFAULT 0,
    "gmailAttachmentId" TEXT,
    "purgedAt"          TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_emailId_idx" ON "Attachment"("emailId");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_emailId_fkey"
  FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RetentionPolicy
CREATE TABLE "RetentionPolicy" (
    "id"                           TEXT    NOT NULL,
    "userId"                       TEXT    NOT NULL,
    "metadataOnlyAfterDays"        INTEGER NOT NULL DEFAULT 30,
    "purgeAfterDays"               INTEGER NOT NULL DEFAULT 90,
    "taskDoneArchiveAfterDays"     INTEGER NOT NULL DEFAULT 0,
    "taskDoneMetadataOnlyAfterDays" INTEGER NOT NULL DEFAULT 30,
    "taskDoneRestoreWindowDays"    INTEGER NOT NULL DEFAULT 30,
    "attachmentPurgeAfterDays"     INTEGER NOT NULL DEFAULT 60,
    "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RetentionPolicy_userId_key" ON "RetentionPolicy"("userId");

ALTER TABLE "RetentionPolicy"
  ADD CONSTRAINT "RetentionPolicy_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ProtectionRule
CREATE TABLE "ProtectionRule" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "ruleType"  "ProtectionRuleType" NOT NULL,
    "value"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtectionRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProtectionRule_userId_ruleType_value_key"
  ON "ProtectionRule"("userId", "ruleType", "value");

CREATE INDEX "ProtectionRule_userId_idx" ON "ProtectionRule"("userId");

ALTER TABLE "ProtectionRule"
  ADD CONSTRAINT "ProtectionRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RetentionJobLog
CREATE TABLE "RetentionJobLog" (
    "id"                TEXT    NOT NULL,
    "userId"            TEXT    NOT NULL,
    "triggeredBy"       TEXT    NOT NULL DEFAULT 'cron',
    "startedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"       TIMESTAMP(3),
    "emailsArchived"    INTEGER NOT NULL DEFAULT 0,
    "emailsMetaOnly"    INTEGER NOT NULL DEFAULT 0,
    "emailsPurged"      INTEGER NOT NULL DEFAULT 0,
    "attachmentsPurged" INTEGER NOT NULL DEFAULT 0,
    "bytesFreed"        BIGINT  NOT NULL DEFAULT 0,
    "errorCount"        INTEGER NOT NULL DEFAULT 0,
    "errors"            JSONB,

    CONSTRAINT "RetentionJobLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RetentionJobLog_userId_startedAt_idx"
  ON "RetentionJobLog"("userId", "startedAt" DESC);

ALTER TABLE "RetentionJobLog"
  ADD CONSTRAINT "RetentionJobLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
