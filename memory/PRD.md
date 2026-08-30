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
- Deep Analysis (AI second opinion): `/api/deep-analysis` + `/api/campaigns/{id}/deep-analysis` (persisted); shown in Create Launch, Experiment Detail, and read-only on the shared Report. Graceful fallback if AI down.
- Angle Rewrite: `/api/rewrite` improves a chosen weak factor, deterministic re-score, Before/After + downgrade warning.
- Theme system: light/dark/system via next-themes + CSS tokens (exact palettes), persisted (`ll_theme`); ThemeToggle in header/sidebar.
- Virality Score: expandable per-factor explanations, weak-factor warning icons, default-expanded on the Report.
- Verified across testing iterations 2–4: 66/66 backend pytest, all frontend flows, zero console errors.

- Code-review safe fixes (2026-06, iteration 8): stable React keys (composite `${idx}-${reason}`) in DeepAnalysis/AngleRewrite, literal skeleton keys in Leaderboard; console.debug in VoiceButton catch blocks; test-file demo creds moved to `os.environ.get` with defaults. Deliberately SKIPPED (per user): httpOnly cookie migration, complexity refactors, hook-dependency edits — localStorage+JWT Bearer is intentional. "Undefined variable" and `is`/`is not None` findings confirmed FALSE POSITIVES (all branches assign; None/bool singleton checks are correct). Verified: 81/81 backend pytest, 100% frontend flows, zero console errors.

- Deployment finalization (2026-06, iteration 9): production build passes clean (285 kB gzip, zero warnings); deployment_agent = PASS (no hardcoded secrets, env-only URLs, valid supervisor/CORS). Polish shipped: LaunchLoop AI branding in index.html (title + meta description); self-healing demo audience seed (insert-if-missing by name so demo data can't degrade); landing 390px horizontal overflow fixed (0px, was 6px) via overflow-x-clip; report Copy-link execCommand fallback for restricted clipboard contexts; print CSS `break-inside: avoid` on report cards. Verified: 81/81 backend pytest, full E2E frontend journey, all 3 themes, voice-to-text, AI fallback, mobile/tablet/desktop, zero console errors. STATUS: READY TO DEPLOY.

## Backlog
- P1: Partial (PATCH) audience updates; Pydantic models for /score and /audiences/refresh.
- P2: Report "Try LaunchLoop" CTA for anonymous viewers; model-judged "deep analysis" scoring mode.
- Future: OAuth + teams, real billing (Stripe/Razorpay), live metric integrations (X, Product Hunt).
