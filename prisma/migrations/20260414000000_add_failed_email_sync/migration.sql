-- CreateTable
CREATE TABLE "FailedEmailSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "threadId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "subject" TEXT,
    "sender" TEXT,
    "errorReason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "firstFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FailedEmailSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FailedEmailSync_userId_gmailMessageId_key" ON "FailedEmailSync"("userId", "gmailMessageId");

-- AddForeignKey
ALTER TABLE "FailedEmailSync" ADD CONSTRAINT "FailedEmailSync_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
