# LaunchLoop AI — PRD

## Original Problem Statement
Upgrade the existing LaunchLoop AI (V1) in place into a polished, demo-reliable GTM platform that helps founders build launches people actually share. Analyze product + audience → generate launch angles → score virality with an explainable heuristic → run campaign → compare prediction vs reality → learn. Must be fully demoable with NO external API key (synthetic fallback). Do NOT scaffold a new project.

## Architecture
- **Frontend:** React 19 (CRA + craco, `@` alias), Tailwind, framer-motion, recharts, sonner. Dark "growth tool" theme (Manrope / IBM Plex Sans / JetBrains Mono).
- **Backend:** FastAPI, all routes under `/api`. Modules: `server.py` (routes), `virality.py` (deterministic 5-factor scoring + metrics), `llm_service.py` (Gemini 3 Flash + cache + synthetic fallback), `auth.py` (JWT Bearer + bcrypt), `seed.py` (idempotent seeding), `models.py`.
- **DB:** MongoDB — collections: users, audience_profiles, campaigns, angle_cache, leaderboard_seed. UUID string ids (no ObjectId leaks).
- **AI:** `gemini-3-flash-preview` via Emergent Universal Key. Falls back to deterministic templates; results cached by input hash.

## User Personas
- Indie SaaS founders shipping on nights/weekends.
- In-house growth/product marketers at Series A–B startups.

## Core Requirements (static)
- Explainable virality score (5 factors, never a black box).
- Prediction vs Reality loop, synthetic by default, real-metric overridable.
- Reusable Audience DNA. Global + personal leaderboard. Analytics. Shareable reports.
- Works end-to-end with no external key.

## Implemented (2026-06)
- JWT auth: pre-seeded demo user (demo@launchloop.ai / demo1234), instant `/api/auth/demo`, email signup/login.
- Create Launch 5-step wizard: Product → Audience → Goal → Platforms → Generate.
- 5-factor explainable Virality Score (Hook, Emotional Trigger, Audience Fit, Shareability, Platform Fit) with per-factor bars + reasons.
- Launch Twin experiment detail: PREDICTION → LAUNCH → REALITY → LEARNING stages.
- Prediction vs Reality (impressions/engagement/shares/conversions) with OVERPERFORMED/MATCHED/UNDERPERFORMED verdict; real-metric override + synthetic regenerate; "What We Learned" note.
- Audience DNA CRUD + AI-suggest, rich fields, reuse-in-launch.
- Leaderboard (global 10 seeds + mine), Analytics (score trend, accuracy, pred-vs-real, factor radar, best angle/platform, top angles).
- Shareable public report (/report/:id) with copy-link + download (print) + start-new-experiment.
- Verified: 29/29 backend pytest, all frontend flows (iteration_1). Fixed toast overlap + button-nesting warning.

## Backlog
- P1: Partial (PATCH) audience updates; Pydantic models for /score and /audiences/refresh.
- P2: Report "Try LaunchLoop" CTA for anonymous viewers; model-judged "deep analysis" scoring mode.
- Future: OAuth + teams, real billing (Stripe/Razorpay), live metric integrations (X, Product Hunt).
