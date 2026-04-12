WITH demo_user AS (
  SELECT id
  FROM "User"
  WHERE email = 'demo@emailflow.ai'
  LIMIT 1
),
upsert_identities AS (
  INSERT INTO "UserIdentity" (
    id, "userId", name, description, status, keywords, hints, confidence, "createdAt", "updatedAt"
  )
  SELECT
    v.id,
    u.id,
    v.name,
    v.description,
    'active',
    '[]'::jsonb,
    '[]'::jsonb,
    v.confidence,
    NOW(),
    NOW()
  FROM demo_user u
  CROSS JOIN (
    VALUES
      ('identity-demo-work', 'PM at TechCorp', 'Full-time product management context for TechCorp work.', 0.96::double precision),
      ('identity-demo-founder', 'Founder - SideApp', 'Startup founder context for SideApp product, growth, and fundraising.', 0.94::double precision)
  ) AS v(id, name, description, confidence)
  ON CONFLICT ("userId", name) DO UPDATE
  SET
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    confidence = EXCLUDED.confidence,
    "updatedAt" = NOW()
  RETURNING id, name, "userId"
),
identity_lookup AS (
  SELECT i.id, i.name, i."userId"
  FROM "UserIdentity" i
  JOIN demo_user u ON u.id = i."userId"
),
upsert_projects AS (
  INSERT INTO "ProjectContext" (
    id, "userId", "identityId", name, description, status, keywords, participants, confidence, "createdAt", "updatedAt"
  )
  SELECT
    v.id,
    u.id,
    i.id,
    v.name,
    v.description,
    'active',
    '[]'::jsonb,
    '[]'::jsonb,
    v.confidence,
    NOW(),
    NOW()
  FROM demo_user u
  JOIN identity_lookup i
    ON i."userId" = u.id
  CROSS JOIN (
    VALUES
      ('project-demo-q1', 'PM at TechCorp', 'Q1 Planning & Reporting', 'Board reports, OKRs, planning docs, and stakeholder reviews.', 0.96::double precision),
      ('project-demo-ops', 'PM at TechCorp', 'Infrastructure & Team Ops', 'Vendors, infra alerts, HR reminders, sprint operations, and internal logistics.', 0.91::double precision),
      ('project-demo-fundraising', 'Founder - SideApp', 'Fundraising & BD', 'Investors, partnerships, warm intros, and business development threads.', 0.95::double precision),
      ('project-demo-product', 'Founder - SideApp', 'Product & Growth', 'Product feedback, onboarding, user research, and growth execution.', 0.92::double precision)
  ) AS v(id, identity_name, name, description, confidence)
  WHERE i.name = v.identity_name
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
  JOIN demo_user u ON u.id = p."userId"
),
latest_thread_email AS (
  SELECT DISTINCT ON (e."threadId")
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
  JOIN demo_user u ON u.id = e."userId"
  WHERE e."threadId" IS NOT NULL
  ORDER BY e."threadId", e."receivedAt" DESC
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
      WHEN l."accountEmail" = 'demo.sideapp@gmail.com' THEN
        CASE
          WHEN lower(coalesce(l.subject, '')) LIKE '%investor%'
            OR lower(coalesce(l.subject, '')) LIKE '%deck%'
            OR lower(coalesce(l.subject, '')) LIKE '%partnership%'
            OR lower(coalesce(l.subject, '')) LIKE '%enterprise lead%'
            OR lower(coalesce(l.sender, '')) LIKE '%vc%'
            OR lower(coalesce(l.sender, '')) LIKE '%investor%'
          THEN 'Fundraising & BD'
          ELSE 'Product & Growth'
        END
      WHEN l."accountEmail" = 'demo@emailflow.ai' THEN
        CASE
          WHEN lower(coalesce(l.subject, '')) LIKE '%invoice%'
            OR lower(coalesce(l.subject, '')) LIKE '%contract%'
            OR lower(coalesce(l.subject, '')) LIKE '%cloudhost%'
            OR lower(coalesce(l.subject, '')) LIKE '%timesheet%'
            OR lower(coalesce(l.subject, '')) LIKE '%offsite%'
            OR lower(coalesce(l.subject, '')) LIKE '%sprint%'
            OR lower(coalesce(l.subject, '')) LIKE '%github actions%'
            OR lower(coalesce(l.sender, '')) LIKE '%hr@%'
            OR lower(coalesce(l.sender, '')) LIKE '%vendor%'
          THEN 'Infrastructure & Team Ops'
          ELSE 'Q1 Planning & Reporting'
        END
      ELSE NULL
    END AS project_name,
    CASE
      WHEN lower(coalesce(l.subject, '')) LIKE '%invoice%' THEN 'invoice'
      WHEN lower(coalesce(l.subject, '')) LIKE '%contract%' THEN 'approval'
      WHEN lower(coalesce(l.subject, '')) LIKE '%meeting%'
        OR lower(coalesce(l.subject, '')) LIKE '%sync%'
        OR lower(coalesce(l.subject, '')) LIKE '%offsite%'
        OR lower(coalesce(l.subject, '')) LIKE '%planning%'
      THEN 'meeting'
      WHEN lower(coalesce(l.subject, '')) LIKE '%deadline%'
        OR lower(coalesce(l.subject, '')) LIKE '%today%'
        OR lower(coalesce(l.subject, '')) LIKE '%confirm attendance%'
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
    'matter-' || t."threadId",
    t."userId",
    t.project_id,
    LEFT(COALESCE(t.subject, 'Untitled thread'), 120),
    t.topic,
    COALESCE(NULLIF(t."bodyPreview", ''), 'Email thread imported from demo history.'),
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
    'threadmem-' || t."threadId",
    t."userId",
    t."threadId",
    LEFT(COALESCE(t.subject, 'Untitled thread'), 120),
    t.topic,
    COALESCE(NULLIF(t."bodyPreview", ''), 'Email thread imported from demo history.'),
    CASE WHEN t.classification = 'ignore' THEN 'completed' ELSE 'open' END,
    NULL,
    'matter-' || t."threadId",
    NULL,
    t.id,
    t."receivedAt",
    t.email_count,
    t.classification,
    to_jsonb(ARRAY[COALESCE(t.sender, 'unknown')]),
    FALSE,
    0.88,
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
