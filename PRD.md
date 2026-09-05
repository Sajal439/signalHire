# PRD — Job-Fit Engine

## 1. Problem

Job search during placement season is high-volume, low-signal. Postings are scattered
across company career pages, aggregators, and community threads. Manually reading
descriptions and judging fit against your own resume doesn't scale, and generic
"scrape everything and list it" tools (e.g. LinkedIn scrapers) add no judgment — they
just move the noise from one place to another, and carry real legal/ToS risk against
LinkedIn specifically.

## 2. Goal

Build a personal tool that:
1. Pulls job postings from a small set of **legitimate, public** sources.
2. Uses embeddings + an LLM to **judge fit** against a specific resume/skill profile,
   not just keyword-match.
3. Delivers a short, ranked daily digest instead of a raw list.
4. Is usable as a real resume project: demonstrates AI application design (embeddings,
   semantic ranking, LLM-based reasoning), not just an API-calling script.

## 3. Primary user

Sajal, actively job-hunting during placement season, is the first user and design
reference point. Multi-user support is in scope for v1: any user should be able to sign
up, submit their own resume/skill profile, and receive their own personalized digest,
independent of other users' profiles and notification history.

## 4. Core user story

> As a job seeker, each morning I want a short list of the postings from the last 24h
> that most closely match my skills and target roles, each with a one-line explanation
> of *why* it's a good fit, so I don't have to manually read through dozens of listings.

## 5. Functional requirements (MVP)

| # | Requirement |
|---|---|
| F1 | Fetch job postings on a schedule from ≥2 legitimate public sources (RemoteOK public API, HN "Who's Hiring" monthly thread) |
| F2 | Store postings in Postgres, deduplicated (by source + external ID, and by fuzzy title+company match); postings are shared across all users, not fetched per-user |
| F3 | Support multiple user accounts, each with their own resume/skill profile (plain text or structured) as their matching target |
| F4 | Generate embeddings for each new posting (once, shared) and for each user's resume profile |
| F5 | Rank postings per user by cosine similarity against that user's resume profile |
| F6 | For postings above a similarity threshold (evaluated per user), call an LLM to produce a short fit explanation and a 0–100 fit score |
| F7 | Deliver each user's top N ranked postings as their own daily digest via Telegram, sent only to that user's linked chat |
| F8 | Avoid re-notifying a given user on postings already sent to them in a previous digest (tracked per user, not globally) |
| F9 | Allow a user to sign up, log in, and link their own Telegram chat to their account |
| F10 | Keep one user's resume profile, match scores, and notification history fully isolated from every other user's |

## 6. Non-functional requirements

- **Legitimacy**: no scraping of sites that prohibit it in their ToS or robots.txt. No LinkedIn.
- **Cost control**: embeddings/LLM calls only run on new postings, not the whole DB every run.
- **Runtime**: full daily pipeline (fetch → embed → match → notify) completes in a few minutes, cheap enough to run daily indefinitely on a free/low tier host.
- **Resume-readiness**: code and README must be clean enough to walk an interviewer through end to end.

## 7. Out of scope (v1)

- LinkedIn or any ToS-restricted scraping
- Web dashboard / UI (Telegram digest is sufficient for v1)
- Auto-apply or auto-outreach
- Company research enrichment (funding data, Crunchbase, etc.)
- Vector DB / pgvector (JS-side cosine similarity is sufficient at this data scale)

## 8. Success criteria

- Runs unattended on a daily cron for at least a week without manual intervention.
- Sajal personally uses at least one surfaced posting to apply during placement season.
- A second real user (e.g. a friend) can sign up, submit their own resume, and receive
  a digest that is correctly personalized to them and isolated from Sajal's data.
- Project is demoable end-to-end in an interview in under 5 minutes.

## 9. Data sources (v1)

| Source | Type | Notes |
|---|---|---|
| RemoteOK | Public JSON API | No auth required, remote-skewed, includes startups |
| HN "Who's Hiring" | Public thread via HN Firebase API | Monthly thread, strongly startup-skewed, matches original "startup openings" intent without scraping risk |

Future (post-v1, not committed): Greenhouse/Lever public job-board JSON endpoints for
specific target companies — these are intentionally public and not a ToS concern, unlike
LinkedIn.

## 10. Open questions

- Exact similarity threshold (`MIN_SIMILARITY`) and digest size (`DIGEST_TOP_N`) will need tuning after seeing real data — treat initial values as placeholders.
- Whether resume profile should be free text or structured (skills list + target roles) — affects embedding quality. Default plan: start free text (paste resume), revisit if match quality is poor.
- Auth mechanism for sign-up/login is not yet decided (e.g. simple email+password vs. Telegram-only identity where the bot's `/start` command itself creates the account) — see `docs/DESIGN.md` §2 for the current default assumption.
- Whether each user gets exactly one resume profile or can maintain several (e.g. for different role types) — v1 default is one profile per user; revisit if needed.
