WITH user_scope AS (
  SELECT DISTINCT u.id, u.email, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS display_name
  FROM "User" u
  JOIN "Email" e ON e."userId" = u.id
),
identity_seed AS (
  SELECT
    u.id AS user_id,
    'identity-' || u.id || '-work' AS identity_id,
    'Primary Work' AS name,
    'Core work context inferred from existing mailbox history.' AS description,
    0.9::double precision AS confidence
  FROM user_scope u
  UNION ALL
  SELECT
    u.id AS user_id,
    'identity-' || u.id || '-side' AS identity_id,
    'Side Projects' AS name,
    'Side-project and founder-style context inferred from existing mailbox history.' AS description,
    0.82::double precision AS confidence
  FROM user_scope u
),
upsert_identities AS (
  INSERT INTO "UserIdentity" (
    id, "userId", name, description, status, keywords, hints, confidence, "createdAt", "updatedAt"
  )
  SELECT
    s.identity_id,
    s.user_id,
    s.name,
    s.description,
    'active',
    '[]'::jsonb,
    '[]'::jsonb,
    s.confidence,
    NOW(),
    NOW()
  FROM identity_seed s
  ON CONFLICT ("userId", name) DO UPDATE
  SET
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    "updatedAt" = NOW()
),
identity_lookup AS (
  SELECT i.id, i.name, i."userId"
  FROM "UserIdentity" i
  JOIN user_scope u ON u.id = i."userId"
  WHERE i.name IN ('Primary Work', 'Side Projects')
),
project_seed AS (
  SELECT u.id AS user_id, 'Core Delivery' AS name, 'Primary Work' AS identity_name, 'Deadlines, reports, reviews, and main delivery threads.' AS description, 0.92::double precision AS confidence
  FROM user_scope u
  UNION ALL
  SELECT u.id AS user_id, 'Operations & Admin' AS name, 'Primary Work' AS identity_name, 'Ops, infra, finance, HR, and scheduling threads.' AS description, 0.87::double precision AS confidence
  FROM user_scope u
  UNION ALL
  SELECT u.id AS user_id, 'Product & Growth' AS name, 'Side Projects' AS identity_name, 'Product feedback, users, onboarding, and growth conversations.' AS description, 0.86::double precision AS confidence
  FROM user_scope u
  UNION ALL
  SELECT u.id AS user_id, 'Partnerships & Fundraising' AS name, 'Side Projects' AS identity_name, 'Investor, BD, partnership, and intro-related threads.' AS description, 0.88::double precision AS confidence
  FROM user_scope u
),
upsert_projects AS (
  INSERT INTO "ProjectContext" (
    id, "userId", "identityId", name, description, status, keywords, participants, confidence, "createdAt", "updatedAt"
  )
  SELECT
    'project-' || p.user_id || '-' || lower(replace(replace(p.name, ' ', '-'), '&', 'and')),
    p.user_id,
    i.id,
    p.name,
    p.description,
    'active',
    '[]'::jsonb,
    '[]'::jsonb,
    p.confidence,
    NOW(),
    NOW()
  FROM project_seed p
  JOIN identity_lookup i
    ON i."userId" = p.user_id
   AND i.name = p.identity_name
  ON CONFLICT ("userId", name) DO UPDATE
  SET
    "identityId" = EXCLUDED."identityId",
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    "updatedAt" = NOW()
),
project_lookup AS (
  SELECT p.id, p.name, p."userId"
  FROM "ProjectContext" p
  JOIN user_scope u ON u.id = p."userId"
  WHERE p.name IN ('Core Delivery', 'Operations & Admin', 'Product & Growth', 'Partnerships & Fundraising')
),
latest_thread_email AS (
  SELECT DISTINCT ON (e."userId", e."threadId")
    e.id,
    e."userId",
    e."threadId",
    e.subject,
    e.sender,
    e."bodyPreview",
    e."receivedAt",
    e.classification,
    e."accountEmail"
  FROM "Email" e
  JOIN user_scope u ON u.id = e."userId"
  WHERE e."threadId" IS NOT NULL
  ORDER BY e."userId", e."threadId", e."receivedAt" DESC
),
thread_rollup AS (
  SELECT
    l.*,
    (
      SELECT COUNT(*)
      FROM "Email" e2
      WHERE e2."userId" = l."userId" AND e2."threadId" = l."threadId"
    ) AS email_count,
    CASE
      WHEN lower(coalesce(l.subject, '')) LIKE '%investor%'
        OR lower(coalesce(l.subject, '')) LIKE '%fund%'
        OR lower(coalesce(l.subject, '')) LIKE '%partnership%'
        OR lower(coalesce(l.subject, '')) LIKE '%intro%'
        OR lower(coalesce(l.sender, '')) LIKE '%vc%'
      THEN 'Partnerships & Fundraising'
      WHEN lower(coalesce(l.subject, '')) LIKE '%onboarding%'
        OR lower(coalesce(l.subject, '')) LIKE '%user interview%'
        OR lower(coalesce(l.subject, '')) LIKE '%design review%'
        OR lower(coalesce(l.subject, '')) LIKE '%growth%'
        OR lower(coalesce(l.subject, '')) LIKE '%launch%'
      THEN 'Product & Growth'
      WHEN lower(coalesce(l.subject, '')) LIKE '%invoice%'
        OR lower(coalesce(l.subject, '')) LIKE '%contract%'
        OR lower(coalesce(l.subject, '')) LIKE '%timesheet%'
        OR lower(coalesce(l.subject, '')) LIKE '%offsite%'
        OR lower(coalesce(l.subject, '')) LIKE '%billing%'
        OR lower(coalesce(l.subject, '')) LIKE '%github actions%'
        OR lower(coalesce(l.sender, '')) LIKE '%hr@%'
        OR lower(coalesce(l.sender, '')) LIKE '%legal%'
      THEN 'Operations & Admin'
      ELSE 'Core Delivery'
    END AS project_name,
    CASE
      WHEN lower(coalesce(l.subject, '')) LIKE '%invoice%' THEN 'invoice'
      WHEN lower(coalesce(l.subject, '')) LIKE '%contract%' THEN 'approval'
      WHEN lower(coalesce(l.subject, '')) LIKE '%meeting%'
        OR lower(coalesce(l.subject, '')) LIKE '%sync%'
        OR lower(coalesce(l.subject, '')) LIKE '%planning%'
        OR lower(coalesce(l.subject, '')) LIKE '%offsite%'
      THEN 'meeting'
      WHEN lower(coalesce(l.subject, '')) LIKE '%deadline%'
        OR lower(coalesce(l.subject, '')) LIKE '%today%'
        OR lower(coalesce(l.subject, '')) LIKE '%confirm%'
      THEN 'deadline'
      WHEN lower(coalesce(l.subject, '')) LIKE '%report%'
        OR lower(coalesce(l.subject, '')) LIKE '%okr%'
        OR lower(coalesce(l.subject, '')) LIKE '%update%'
      THEN 'project_update'
      ELSE 'other'
    END AS topic
  FROM latest_thread_email l
),
thread_context AS (
  SELECT
    t.*,
    p.id AS project_id
  FROM thread_rollup t
  LEFT JOIN project_lookup p
    ON p."userId" = t."userId"
   AND p.name = t.project_name
),
upsert_matters AS (
  INSERT INTO "MatterMemory" (
    id, "userId", "projectContextId", title, topic, summary, status, "nextAction",
    "linkedPrimaryTaskId", "lastEmailId", "lastMessageAt", "threadCount", "emailCount",
    "lastClassification", participants, keywords, "createdAt", "updatedAt"
  )
  SELECT
    'matter-' || t."userId" || '-' || t."threadId",
    t."userId",
    t.project_id,
    LEFT(COALESCE(t.subject, 'Untitled thread'), 120),
    t.topic,
    COALESCE(NULLIF(t."bodyPreview", ''), 'Email thread imported from existing history.'),
    CASE WHEN t.classification = 'ignore' THEN 'completed' ELSE 'open' END,
    NULL,
    NULL,
    t.id,
    t."receivedAt",
    1,
    t.email_count,
    t.classification,
    to_jsonb(ARRAY[COALESCE(t.sender, 'unknown')]),
    '[]'::jsonb,
    NOW(),
    NOW()
  FROM thread_context t
  WHERE t.project_id IS NOT NULL
  ON CONFLICT (id) DO UPDATE
  SET
    "projectContextId" = EXCLUDED."projectContextId",
    title = EXCLUDED.title,
    topic = EXCLUDED.topic,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    "lastEmailId" = EXCLUDED."lastEmailId",
    "lastMessageAt" = EXCLUDED."lastMessageAt",
    "threadCount" = EXCLUDED."threadCount",
    "emailCount" = EXCLUDED."emailCount",
    "lastClassification" = EXCLUDED."lastClassification",
    participants = EXCLUDED.participants,
    "updatedAt" = NOW()
),
upsert_threads AS (
  INSERT INTO "ThreadMemory" (
    id, "userId", "threadId", title, topic, summary, status, "nextAction",
    "matterId", "linkedTaskId", "lastEmailId", "lastMessageAt", "emailCount",
    "lastClassification", participants, "needsFullAnalysis", confidence, "createdAt", "updatedAt"
  )
  SELECT
    'threadmem-' || t."userId" || '-' || t."threadId",
    t."userId",
    t."threadId",
    LEFT(COALESCE(t.subject, 'Untitled thread'), 120),
    t.topic,
    COALESCE(NULLIF(t."bodyPreview", ''), 'Email thread imported from existing history.'),
    CASE WHEN t.classification = 'ignore' THEN 'completed' ELSE 'open' END,
    NULL,
    'matter-' || t."userId" || '-' || t."threadId",
    NULL,
    t.id,
    t."receivedAt",
    t.email_count,
    t.classification,
    to_jsonb(ARRAY[COALESCE(t.sender, 'unknown')]),
    FALSE,
    0.82,
    NOW(),
    NOW()
  FROM thread_context t
  WHERE t.project_id IS NOT NULL
  ON CONFLICT ("userId", "threadId") DO UPDATE
  SET
    title = EXCLUDED.title,
    topic = EXCLUDED.topic,
    summary = EXCLUDED.summary,
    status = EXCLUDED.status,
    "matterId" = EXCLUDED."matterId",
    "lastEmailId" = EXCLUDED."lastEmailId",
    "lastMessageAt" = EXCLUDED."lastMessageAt",
    "emailCount" = EXCLUDED."emailCount",
    "lastClassification" = EXCLUDED."lastClassification",
    participants = EXCLUDED.participants,
    confidence = EXCLUDED.confidence,
    "updatedAt" = NOW()
)
SELECT 1;
