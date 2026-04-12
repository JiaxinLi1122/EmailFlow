-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "keywords" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "hints" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContext" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "keywords" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "participants" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectContext_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MatterMemory" ADD COLUMN "projectContextId" TEXT;

-- CreateIndex
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE UNIQUE INDEX "UserIdentity_userId_name_key" ON "UserIdentity"("userId", "name");
CREATE INDEX "ProjectContext_userId_idx" ON "ProjectContext"("userId");
CREATE INDEX "ProjectContext_identityId_idx" ON "ProjectContext"("identityId");
CREATE UNIQUE INDEX "ProjectContext_userId_name_key" ON "ProjectContext"("userId", "name");

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectContext" ADD CONSTRAINT "ProjectContext_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectContext" ADD CONSTRAINT "ProjectContext_identityId_fkey"
FOREIGN KEY ("identityId") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatterMemory" ADD CONSTRAINT "MatterMemory_projectContextId_fkey"
FOREIGN KEY ("projectContextId") REFERENCES "ProjectContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;
