# Design Doc — Job-Fit Engine

## 1. Architecture overview

```
 ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
 │  Fetchers  │ --> │  Postgres  │ --> │  Embedder  │ --> │  Matcher   │
 │ (cron job) │     │  (Prisma)  │     │ (OpenAI)   │     │ (cosine +  │
 └────────────┘     └────────────┘     └────────────┘     │  LLM score)│
                                                            └─────┬──────┘
                                                                  │
                                                            ┌─────▼──────┐
                                                            │  Notifier  │
                                                            │ (Telegram) │
                                                            └────────────┘
```

The pipeline runs once daily via `node-cron` (or an external cron trigger on the host,
e.g. Render Cron Jobs). Each stage is a separate script that can also be run
independently for debugging (`npm run fetch`, `npm run embed`, `npm run match`,
`npm run notify`).

## 2. Data model (Prisma / Postgres)

```prisma
model User {
  id                String    @id @default(cuid())
  email             String?   @unique
  passwordHash      String?
  telegramChatId    String?   @unique  // set once user links their bot chat
  createdAt         DateTime  @default(now())

  resumeProfile     ResumeProfile?
  matches           JobMatch[]
}

model Job {
  id            String   @id @default(cuid())
  source        String   // "remoteok" | "hn_whoishiring"
  externalId    String   // source's own id/url, used for dedup
  title         String
  company       String
  description   String   @db.Text
  url           String
  location      String?
  remote        Boolean  @default(false)
  postedAt      DateTime?
  fetchedAt     DateTime @default(now())

  embedding     Float[]  // JSON-serialized vector, computed once and shared across users
  embeddedAt    DateTime?

  matches       JobMatch[]

  @@unique([source, externalId])
}

model ResumeProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  rawText     String   @db.Text   // pasted resume / skills summary
  embedding   Float[]
  updatedAt   DateTime @updatedAt
}

// Per-user score against a given job — this is what makes matching multi-tenant:
// Job embeddings are computed once and shared, but every (user, job) pair gets its
// own similarity/LLM score and its own notification state.
model JobMatch {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  jobId       String
  job         Job      @relation(fields: [jobId], references: [id])

  fitScore    Float?   // 0-1 cosine similarity, this user vs. this job
  llmScore    Int?     // 0-100, set only for pairs above MIN_SIMILARITY
  llmReason   String?  @db.Text
  scoredAt    DateTime?

  notifiedAt  DateTime? // set once included in this user's digest

  @@unique([userId, jobId])
}
```

Embeddings are stored as plain `Float[]` columns rather than a vector extension —
see §5 for why. Job postings themselves are fetched and embedded **once** and shared
across all users; only the `JobMatch` scoring step is per-user. This keeps fetch/embed
cost flat regardless of user count, while keeping every user's scores and notification
history fully isolated (F10).

## 3. Component breakdown

### 3.1 Fetchers (`src/fetchers/`)
- `remoteok.js` — GET the public RemoteOK JSON feed, map fields to the `Job` shape.
- `hn.js` — Use the HN Firebase API to pull the current month's "Who is Hiring?" thread
  and its top-level comments (each comment is one posting), lightly parse company/role
  out of free text.
- `run.js` — orchestrates both fetchers, upserts into Postgres on `[source, externalId]`.

Each fetcher is isolated so adding a third source later (e.g. a specific company's
Greenhouse board) means adding one file, not touching the pipeline.

### 3.2 Embedder (`src/embeddings/`)
- Selects `Job` rows where `embeddedAt IS NULL`.
- Calls OpenAI embeddings API (`text-embedding-3-small`) in small batches.
- Writes the vector back and stamps `embeddedAt`.
- Also (re)embeds the `ResumeProfile` if its text changed since `updatedAt`.

### 3.3 Matcher (`src/matching/`)
- For each user with a `ResumeProfile`, computes cosine similarity in JS between that
  user's resume embedding and every job embedding that doesn't yet have a `JobMatch`
  row for that user.
- For (user, job) pairs above `MIN_SIMILARITY`, makes one LLM call (`gpt-4o-mini`) asking
  for a fit score (0–100) and a one-sentence reason, using that user's resume text and
  the job description as context.
- This two-stage design (cheap vector filter → expensive LLM call only on plausible
  matches) keeps LLM spend bounded regardless of how many postings get fetched — and
  the per-user filtering step means adding more users doesn't multiply cost against
  jobs that clearly aren't relevant to them.

### 3.4 Notifier (`src/notify/`)
- For each user with a linked `telegramChatId`, selects that user's top `DIGEST_TOP_N`
  `JobMatch` rows by `llmScore` where `notifiedAt IS NULL`.
- Formats and sends a Telegram message (or one batched message) to that user's chat only.
- Stamps `notifiedAt` on each sent `JobMatch` so the same posting never appears twice in
  the same user's digest — this is per-user state, not global, so one user being sent a
  job has no effect on whether another user is later sent the same job.

## 4. Why these choices

| Decision | Reasoning |
|---|---|
| Postgres + Prisma, no vector DB | At a scale of hundreds–low thousands of postings, JS-side cosine similarity is fast enough and avoids adding pgvector setup/ops overhead during a one-week build. |
| Two-stage filter (cosine, then LLM) | Bounds LLM API cost; only "plausible" matches get the expensive call. |
| Telegram over WhatsApp/Twilio | No business verification needed, free, a bot can be created and used in minutes. |
| RemoteOK + HN over LinkedIn | Both are public, ToS-friendly sources; HN's "Who's Hiring" thread specifically skews toward startups, which matches the original product intent without scraping risk. |
| Separate runnable stages | Each stage (fetch/embed/match/notify) can be debugged and re-run independently rather than only as one opaque pipeline. |
| Jobs fetched/embedded once, matched per user | Avoids refetching or re-embedding the same posting once per user; only the (user, job) scoring step scales with user count. |

## 5. Known limitations (be ready to discuss these in an interview)

- Cosine similarity on a single resume-text embedding is a blunt instrument — it won't
  capture nuance like "prefers backend over frontend roles" unless the resume text says
  so explicitly. Acceptable for v1; a structured profile (skills + preferences) would
  improve this later.
- HN thread parsing is regex/heuristic-based since postings are free-text comments, not
  structured data — extraction quality will be imperfect and needs manual spot-checking.
- No retry/backoff strategy specified yet for the OpenAI calls — add before relying on
  this unattended for weeks.
- Auth is intentionally minimal for v1 (see `docs/PRD.md` open questions) — a real
  product would need proper session handling, password reset, etc. The `User` model is
  designed to support that later without a schema rewrite, but v1 should not over-invest
  here relative to the one-week timeline.
- Per-user LLM scoring means cost scales with (active users × plausible matches per
  user), not just with posting volume — worth monitoring if the user base grows beyond
  a handful of people.

## 6. Deployment

- App: Render or Railway (free/low tier).
- Postgres: Neon or the host's managed Postgres.
- Cron: either `node-cron` inside a long-running process, or the host's native cron
  trigger calling `npm run pipeline` daily — the latter is simpler and cheaper since it
  avoids paying for an always-on process.
