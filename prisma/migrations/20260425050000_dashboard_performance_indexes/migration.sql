-- Add indexes for dashboard summary and list-page query paths.
CREATE INDEX "Task_userId_status_priorityScore_idx" ON "Task"("userId", "status", "priorityScore" DESC);
CREATE INDEX "Task_userId_priorityScore_idx" ON "Task"("userId", "priorityScore" DESC);
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt" DESC);

CREATE INDEX "TaskEmail_emailId_idx" ON "TaskEmail"("emailId");

CREATE INDEX "MatterMemory_userId_lastMessageAt_idx" ON "MatterMemory"("userId", "lastMessageAt" DESC);
CREATE INDEX "MatterMemory_userId_status_lastMessageAt_idx" ON "MatterMemory"("userId", "status", "lastMessageAt" DESC);

CREATE INDEX "ThreadMemory_matterId_idx" ON "ThreadMemory"("matterId");
CREATE INDEX "ThreadMemory_userId_matterId_idx" ON "ThreadMemory"("userId", "matterId");
