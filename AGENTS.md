<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DB & Production Environment Changes

If you modify any of the following files in a session, you MUST generate a file called `DB_ENV_CHANGES.md` in the project root summarizing what was changed and why:

- `.env*` files (e.g. `.env.local`, `.env.production`)
- `prisma/schema.prisma`
- Any file under `prisma/migrations/`
- Any file with "migration" or "seed" in the name

The file should list: date, file path, and a one-line description of what changed.

If none of the above files were touched in the session, do NOT create this file.
