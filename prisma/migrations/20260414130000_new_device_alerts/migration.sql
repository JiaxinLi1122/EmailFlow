ALTER TABLE "Session"
  ADD COLUMN "deviceFingerprint" TEXT,
  ADD COLUMN "isNewDevice" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Session_userId_deviceFingerprint_idx" ON "Session"("userId", "deviceFingerprint");
