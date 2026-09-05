# AGENTS.md

This file gives context to AI coding agents (Claude Code, Cursor, etc.) working in this
repository. Read `docs/PRD.md` and `docs/DESIGN.md` first for the full product and
architecture context — this file is about conventions and how to work in the repo, not
what the product does.

## Project summary

Job-Fit Engine: a multi-user pipeline that fetches job postings from legitimate public
sources (RemoteOK, HN "Who is Hiring") once and shares them across all users, then
embeds and ranks them per user against that user's own resume profile, delivering each
user their own daily top-N digest via Telegram. See `docs/PRD.md` §5 for the full
functional requirement list and `docs/DESIGN.md` §2 for the exact data model.

## Repo layout

```
src/
  fetchers/     one file per data source + run.js orchestrator
  embeddings/   embedding generation for jobs + resume profile
  matching/     cosine similarity + LLM fit scoring
  notify/       Telegram digest delivery
  index.js      full pipeline entrypoint (fetch -> embed -> match -> notify)
prisma/
  schema.prisma
docs/
  PRD.md
  DESIGN.md
```

## Ground rules for agents working here

1. **No scraping of sites whose ToS prohibits it.** This project exists specifically to
   avoid LinkedIn-style scraping risk — do not add a fetcher for any source without
   first checking it's a public API or an explicitly public data feed (see
   `docs/PRD.md` §9 for the approved-source list and reasoning).
2. **Don't add a vector DB / pgvector.** This was a deliberate scope decision (see
   `docs/DESIGN.md` §4) to keep the one-week build simple. Don't "improve" this
   unprompted.
3. **Keep pipeline stages independently runnable.** Each of `fetch`, `embed`, `match`,
   `notify` must work standalone via its `npm run <stage>` script, not only as part of
   the full pipeline. This is intentional for debugging.
4. **Bound LLM spend.** Only call the LLM (`CHAT_MODEL`) on jobs that already passed the
   `MIN_SIMILARITY` cosine filter. Never add a code path that LLM-scores every fetched
   job unconditionally.
5. **Idempotency matters.** Fetchers must upsert on `[source, externalId]`; the notifier
   must never re-send a job that already has `notifiedAt` set. Don't remove these
   guards for convenience.
6. **This is a multi-user tool by design (v1 scope).** `Job`/embeddings are shared
   across all users; `ResumeProfile` and `JobMatch` are per-user via `userId`. Never
   write a query that scores, ranks, or notifies across all users' data at once —
   always scope by `userId`. Do not let one user's resume text, match scores, or
   notification history leak into another user's digest. See `docs/DESIGN.md` §2 for
   the exact schema.
7. **Match the existing stack.** Node/Express conventions, Prisma for all DB access
   (no raw SQL unless Prisma genuinely can't express the query), CommonJS (not ESM)
   per `package.json`.

## Environment

Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `OPENAI_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` before running anything. Never commit `.env`.

## Commands

| Command | Purpose |
|---|---|
| `npm run fetch` | Run fetchers only |
| `npm run embed` | Embed any un-embedded jobs/profile |
| `npm run match` | Score un-scored jobs |
| `npm run notify` | Send the digest |
| `npm run pipeline` | Run all four stages in sequence |
| `npm run prisma:migrate` | Apply schema changes |

## When in doubt

If a change would touch the approved-source list, the data model, or the single-user
scope, check `docs/PRD.md` and `docs/DESIGN.md` first — those documents record the
reasoning, not just the decision, so they should resolve most ambiguity without needing
to ask.
