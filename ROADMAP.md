# Roadmap — Job-Fit Engine

This document covers what's deliberately deferred out of v1 (see `docs/PRD.md` §7) and
how it could be phased in later. Nothing here is committed — it's a map of "if this
project keeps going after placement season, here's a sensible order to grow it in,"
useful both for your own planning and as an answer to "where would you take this next?"
in an interview.

## v1 recap (for context)

Multi-user, two sources (RemoteOK + HN "Who's Hiring"), JS-side cosine similarity, one
resume profile per user, Telegram-only delivery, minimal auth. See `docs/PRD.md` and
`docs/DESIGN.md` for full detail.

## v2 — Better matching quality

The riskiest assumption in v1 is that a single free-text resume embedding gives good
matches. v2 focuses on fixing that before adding anything else:

- **Structured resume profile**: skills list, target roles, seniority, location
  preference, remote/onsite preference — embedded separately or used to pre-filter
  before the vector search, rather than relying on one blob of resume text to imply all
  of this.
- **Feedback loop**: let a user mark a delivered match as "good fit" / "not relevant."
  Use this to tune `MIN_SIMILARITY` per user rather than a single global constant, and
  as a dataset to eventually evaluate matching quality quantitatively.
- **Multiple profiles per user**: e.g. one for "backend roles" and one for "SRE roles" —
  deferred from v1 per the PRD open questions, revisit once v1 usage shows whether one
  profile is actually a limitation in practice.

## v3 — More sources, more coverage

Only add sources that stay within the "public, ToS-friendly" constraint from
`docs/PRD.md` §9 — this is a hard line, not just a v1 shortcut:

- **Greenhouse / Lever public job-board JSON endpoints** for a curated list of target
  startups — these companies intentionally expose this data publicly, so it's a
  legitimate expansion, unlike LinkedIn scraping.
- **AngelList/Wellfound**, if/when a usable public API exists at the time.
- **Company career-page RSS feeds**, for companies that publish one.
- Source-quality tracking: which sources actually produce matches users act on, so
  low-value sources can be dropped rather than accumulated indefinitely.

## v4 — Delivery and interaction

- **Web dashboard**: browse all-time matches, re-run matching manually, edit resume
  profile without redeploying — Telegram-only delivery is fine for v1 but doesn't
  scale as a primary interface once there's more to look at.
- **Digest customization**: user-controlled `DIGEST_TOP_N`, minimum score threshold,
  frequency (daily vs. weekly), and muting specific companies/keywords.
- **Additional delivery channels**: email digest as an alternative to Telegram for
  users who prefer it.

## v5 — Scale and cost

Only relevant if the user base actually grows past a small group of friends:

- **Vector DB (pgvector or similar)**: v1 deliberately skips this (see `docs/DESIGN.md`
  §4) because JS-side cosine similarity is fine at small scale. Revisit only once
  job-count × user-count makes in-process comparison measurably slow — don't add this
  preemptively.
- **Batching/rate-limiting LLM calls** more aggressively, and caching LLM fit
  explanations for identical (job, similar-profile) pairs to cut redundant spend.
- **Proper auth**: session hardening, password reset, possibly OAuth — v1's minimal
  auth (see `docs/DESIGN.md` §5) was an explicit one-week-budget trade-off, not a
  permanent design decision.

## Explicitly not planned (even long-term)

- **LinkedIn or any ToS-restricted scraping.** This isn't a "v6 someday" item — it's the
  thing this whole project was designed to avoid. See `docs/PRD.md` and
  `docs/OVERVIEW.md` for the reasoning; it doesn't change with scale.
- **Auto-apply or auto-outreach on a user's behalf.** Surfacing good matches is a very
  different (and much safer) product than autonomously acting on a job board with a
  user's identity — deliberately out of scope indefinitely, not just for v1.

## How to use this document

Don't treat this as a backlog to build sequentially and unprompted. Each version above
should only be started once there's an actual signal that it's needed — e.g. don't
build the web dashboard before Telegram-only delivery has proven insufficient. This
avoids the same "spec grew past what the timeline could support" problem that scoped
down the original [[ai-careeros]] project.
