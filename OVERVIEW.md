# Job-Fit Engine — Overview

This document explains the project end to end in plain language — useful for your own
reference, for a README, or for walking an interviewer through it without diving into
code.

## What it is, in one sentence

A tool that automatically finds job postings from a couple of legitimate public sources,
figures out how well each one actually matches your resume using AI, and sends you a
short daily list of the best matches with a reason for each — instead of you manually
scrolling through job boards.

## Why it exists

Two things drove this:
1. Placement-season job hunting produces too much raw volume and not enough signal —
   most tools just aggregate listings, they don't judge fit.
2. A common version of this idea (scraping LinkedIn) is legally and technically fragile
   — LinkedIn actively fights scrapers, both technically and in court. This project
   deliberately gets the same "surface me relevant startup jobs" value using sources
   that are meant to be publicly consumed, so there's no ToS risk to explain away in an
   interview.

## How it works, step by step

1. **Fetch.** Once a day, the system pulls fresh job postings from RemoteOK's public API
   and Hacker News's monthly "Who is Hiring?" thread (a well-known, startup-heavy
   community hiring thread). Both are intentionally public data, not scraped in a way
   that violates any terms of service.
2. **Store.** New postings are saved to a Postgres database. Duplicate postings (already
   seen from a previous run) are skipped.
3. **Embed.** Each new posting's description is converted into a numerical vector (an
   "embedding") using an AI embedding model — this vector captures the *meaning* of the
   text, not just its keywords. The same is done once for your resume/skills summary.
4. **Rank.** The system compares every job's vector to your resume's vector using cosine
   similarity — a standard way of measuring how close two pieces of text are in meaning.
   This gives a rough fit score for every job, cheaply and instantly.
5. **Judge.** For the postings that scored well enough on that rough pass, the system
   makes a more expensive call to a language model, asking it to actually read the job
   description against your resume and produce: a 0–100 fit score, and one sentence
   explaining *why* it's a good (or mediocre) fit. This step is what makes the tool
   "AI-powered" in a real sense — it's reasoning about fit, not just measuring text
   similarity.
6. **Notify.** The best-ranked jobs (a configurable number, e.g. top 10) are sent to you
   as a digest via a Telegram bot, once a day. Jobs already sent once are never sent
   again.

## What makes this a good resume project

- It's not "call an API and display results" — the embedding + LLM-judging step is
  genuine AI application design, the kind of thing that's actually being asked about in
  interviews right now (semantic search, retrieval-then-rerank patterns, cost-aware LLM
  usage).
- It's a **real tool you use yourself** during placement season — that's a much
  stronger interview answer than a demo project nobody actually uses.
- It's honest about its data sources — no scraping controversy to navigate around when
  someone asks "how did you get this data?"
- It's scoped to be genuinely finishable in about a week, so it can actually ship rather
  than stay half-built.

## Multi-user support

Unlike a purely personal script, this is built to support more than one person from
v1: each user signs up, submits their own resume, and links their own Telegram chat.
Job postings are fetched and embedded once and shared across everyone (there's no
reason to redo that work per user), but the matching, scoring, and notification history
are all kept strictly per-user — one person's resume, match scores, and digest history
never leak into anyone else's. This is a genuinely different (and harder) engineering
problem than a single-user script, and it's the part worth spending the most interview
time explaining.

## What it deliberately does NOT do (and why that's fine to say out loud)

- It doesn't scrape LinkedIn or any site that disallows it — this was a conscious
  trade-off, not a limitation you need to apologize for.
- It doesn't use a dedicated vector database — at this data scale, comparing vectors
  directly in code is simpler and just as effective, and that's a legitimate
  engineering judgment call to describe in an interview, not a shortcut to hide.
- Auth is intentionally minimal for v1 (no password reset flow, no session
  hardening) — the data model supports growing this later without a rewrite, but it's
  not where the one-week budget should go.

## Where the supporting documents live

- `docs/PRD.md` — what the product needs to do and why (requirements, scope, success
  criteria).
- `docs/DESIGN.md` — how it's built (architecture, data model, component responsibilities,
  the reasoning behind each technical choice).
- `AGENTS.md` — guardrails for any AI coding assistant that helps build this, so it
  doesn't quietly drift the scope (e.g. adding LinkedIn scraping, or a vector DB, or
  multi-user support) while you're not looking.
