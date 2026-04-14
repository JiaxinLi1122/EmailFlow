-- Add composite indexes for the /api/emails list query
-- Covers: ORDER BY receivedAt DESC filtered by userId (and optionally classification)
CREATE INDEX "Email_userId_receivedAt_idx" ON "Email"("userId", "receivedAt" DESC);
CREATE INDEX "Email_userId_classification_receivedAt_idx" ON "Email"("userId", "classification", "receivedAt" DESC);
