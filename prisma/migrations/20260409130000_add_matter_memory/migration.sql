-- CreateTable
CREATE TABLE "MatterMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'other',
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "nextAction" TEXT,
    "linkedPrimaryTaskId" TEXT,
    "lastEmailId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "threadCount" INTEGER NOT NULL DEFAULT 0,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "lastClassification" TEXT,
    "participants" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatterMemory_userId_idx" ON "MatterMemory"("userId");

-- CreateIndex
CREATE INDEX "MatterMemory_userId_topic_idx" ON "MatterMemory"("userId", "topic");

-- AlterTable: add matterId to ThreadMemory
ALTER TABLE "ThreadMemory" ADD COLUMN "matterId" TEXT;

-- AddForeignKey
ALTER TABLE "ThreadMemory" ADD CONSTRAINT "ThreadMemory_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "MatterMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
