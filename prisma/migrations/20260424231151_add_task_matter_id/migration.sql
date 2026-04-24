-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "matterId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "MatterMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
