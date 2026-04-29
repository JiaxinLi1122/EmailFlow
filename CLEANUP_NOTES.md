# Cleanup Notes

This file tracks likely cleanup candidates that are safe to review later.
Nothing listed here has been deleted yet.

## High-confidence non-source files in the repo

### Local databases committed to git

- `prisma/dev.db`
- `prisma/dev-backup.db`

Why this is here:
- These are local SQLite database files, not source code.
- `git ls-files` shows they are currently tracked.
- Keeping local DB files in the repo adds noise and can create accidental conflicts.

Suggested later action:
- Stop tracking them in git.
- Keep them ignored locally if they are only for local development.

### Backup Prisma schema

- `prisma/schema.sqlite.backup.prisma`

Why this is here:
- The active schema is `prisma/schema.prisma`.
- This looks like an old backup file.
- Current code searches did not show any runtime usage of this backup schema.

Suggested later action:
- Confirm it is no longer needed, then delete it.

### IDE metadata

- `.idea/`

Why this is here:
- JetBrains project files are currently tracked.
- These are machine/user-specific editor settings rather than app source.

Suggested later action:
- Decide whether the team wants to keep IDE config in version control.
- If not, remove from git and add ignore rules.

## High-confidence dead-code candidates

### Unused digest service wrapper

- `src/services/digest-service.ts`

Why this is here:
- This file only re-exports `createDailyDigest`.
- Current code search did not find any imports of `@/services/digest-service`.
- Call sites import directly from `@/workflows/digest-pipeline`.

Suggested later action:
- Delete this wrapper unless a separate service layer is planned.

### Unused repositories barrel file

- `src/repositories/index.ts`

Why this is here:
- Current code search did not find any imports from `@/repositories`.
- The codebase imports repo modules directly by file.

Suggested later action:
- Delete this barrel file unless the team plans to standardize on barrel imports.

### Unused UI component

- `src/components/context-group-header.tsx`

Why this is here:
- Current code search did not find any imports of this component.

Suggested later action:
- Delete it if it was part of an abandoned UI direction.

### Unused batch review dialog

- `src/components/batch-classification-review-dialog.tsx`

Why this is here:
- Current code search did not find any imports of this component.
- It appears to be related to a review flow that is not currently wired up.

Suggested later action:
- Delete it if the review flow is not being revived.

## Partial / unfinished logic worth revisiting

### Review payload built but not used

- `src/services/email-sync-service.ts`

Why this is here:
- `buildBatchReviewPayload` and `BatchClassificationReviewPayload` are defined.
- `reviewPayload` is created in phase 2.
- The payload is not returned, persisted, or consumed by UI code.
- The current behavior only logs that review items were "stored for future use".

Suggested later action:
- Either finish the feature wiring, or remove the dead intermediate payload logic.

## Utility script to classify before deleting

### One-off maintenance script

- `scripts/dedupe-digests.ts`

Why this is here:
- It is not referenced by `package.json` scripts.
- It is not documented in `LOCAL_DEV.md`.
- It may still be useful, but it looks like a one-time maintenance script.

Suggested later action:
- Keep if needed, but consider moving it under a clearer location such as `scripts/one-off/`.
- Add a short comment or doc note describing when it should be used.

## Code quality / readability cleanup

### Garbled characters in digest pipeline

- `src/workflows/digest-pipeline.ts`

Why this is here:
- The file contains visible encoding artifacts such as `â€”` and `Â·`.
- This is not dead code, but it makes the code feel messier and may leak into output text.

Suggested later action:
- Normalize encoding and replace garbled characters with plain ASCII or intended punctuation.

