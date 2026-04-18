# Production & Database Changes

Date: 2026-04-18

---

## Database Migration Applied

**Migration:** `20260418000000_digest_is_preview`  
**Target:** Neon PostgreSQL (`ep-dawn-base-a79bk0am.ap-southeast-2.aws.neon.tech / neondb`)  
**Status:** ✅ Applied

### SQL

```sql
ALTER TABLE "Digest" ADD COLUMN "isPreview" BOOLEAN NOT NULL DEFAULT false;
```

### Impact
- Adds a new nullable-with-default column to the `Digest` table
- All existing rows default to `false` — no data loss, no breaking change
- Backward compatible: old code that doesn't write `isPreview` is unaffected

---

## Code Changes (no DB impact)

| File | Change |
|------|--------|
| `src/repositories/digest-repo.ts` | Upsert now reads/writes `isPreview` field |
| `src/workflows/digest-pipeline.ts` | Daily: today 00:00 → now; Weekly: Mon 00:00 → now, marked `isPreview: true` |
| `src/app/dashboard/digest/page.tsx` | UI shows "This week so far" badge when `isPreview: true` |
| `src/app/dashboard/tasks/[id]/page.tsx` | Button disabled guards + 1.5s cooldown; confirmed InlineNotice removed; checklist completion dialog |
| `src/app/dashboard/tasks/page.tsx` | TaskRow button disabled guards |

---

## Rollback

To revert the DB column:

```sql
ALTER TABLE "Digest" DROP COLUMN "isPreview";
```

And delete migration folder:  
`prisma/migrations/20260418000000_digest_is_preview/`
