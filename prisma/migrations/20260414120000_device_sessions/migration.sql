ALTER TABLE "Session"
  DROP COLUMN "sessionToken",
  DROP COLUMN "expires",
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "deviceName" TEXT NOT NULL DEFAULT 'Unknown device',
  ADD COLUMN "deviceType" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "browser" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "os" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "ipAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "userAgent" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Session"
SET
  "tokenHash" = COALESCE("tokenHash", "id"),
  "expiresAt" = COALESCE("expiresAt", CURRENT_TIMESTAMP + INTERVAL '30 days');

ALTER TABLE "Session"
  ALTER COLUMN "tokenHash" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_status_lastActiveAt_idx" ON "Session"("userId", "status", "lastActiveAt" DESC);
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
