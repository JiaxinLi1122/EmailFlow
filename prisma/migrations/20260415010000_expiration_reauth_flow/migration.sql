ALTER TABLE "User"
ADD COLUMN "emailProviderReauthRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailProviderReauthReason" TEXT,
ADD COLUMN "emailProviderReauthAt" TIMESTAMP(3),
ADD COLUMN "emailProviderReauthProvider" TEXT;

ALTER TABLE "Session"
ADD COLUMN "remember" BOOLEAN NOT NULL DEFAULT false;
