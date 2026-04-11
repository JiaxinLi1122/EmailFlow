-- Migrate participants and keywords from TEXT (JSON string) to native JSONB.
-- All existing values are valid JSON written by JSON.stringify(), so the cast is safe.
--
-- Order per column: DROP DEFAULT → ALTER TYPE (with USING cast) → SET DEFAULT.
-- PostgreSQL cannot cast a TEXT default to JSONB implicitly, so the default
-- must be dropped before the type change and re-applied afterwards.

ALTER TABLE "ThreadMemory" ALTER COLUMN "participants" DROP DEFAULT;
ALTER TABLE "ThreadMemory" ALTER COLUMN "participants" TYPE JSONB USING "participants"::jsonb;
ALTER TABLE "ThreadMemory" ALTER COLUMN "participants" SET DEFAULT '[]'::jsonb;

ALTER TABLE "MatterMemory" ALTER COLUMN "participants" DROP DEFAULT;
ALTER TABLE "MatterMemory" ALTER COLUMN "participants" TYPE JSONB USING "participants"::jsonb;
ALTER TABLE "MatterMemory" ALTER COLUMN "participants" SET DEFAULT '[]'::jsonb;

ALTER TABLE "MatterMemory" ALTER COLUMN "keywords" DROP DEFAULT;
ALTER TABLE "MatterMemory" ALTER COLUMN "keywords" TYPE JSONB USING "keywords"::jsonb;
ALTER TABLE "MatterMemory" ALTER COLUMN "keywords" SET DEFAULT '[]'::jsonb;
