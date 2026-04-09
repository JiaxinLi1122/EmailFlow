-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "syncStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SenderMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "actionCount" INTEGER NOT NULL DEFAULT 0,
    "awarenessCount" INTEGER NOT NULL DEFAULT 0,
    "ignoreCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenderMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SenderMemory_userId_sender_key" ON "SenderMemory"("userId", "sender");
