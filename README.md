# LaunchLoop AI

**Build launches people actually share.**

LaunchLoop AI is a GTM (go-to-market) intelligence platform for founders. It generates
launch angles with AI, scores their virality with an explainable 5-factor formula, runs a
"Launch Twin" that closes the loop between what you predicted and what really happened, and
turns every launch into a shareable, downloadable report.

---

## Features

- **Demo login** — one-click demo account, no API key required (runs on synthetic data).
- **Authentication** — email signup / login / logout (JWT).
- **Create Launch wizard** — product → audience → goal → platforms → generate angles.
- **Audience DNA** — reusable, editable audience profiles (full CRUD, AI-assisted).
- **Launch Angle Generation** — AI-generated angles (Gemini) with deterministic fallback.
- **Explainable Virality Score** — 5 factors, always shown:
  Hook Strength · Emotional Trigger · Audience Fit · Shareability · Platform Fit.
- **Deep Analysis / AI Second Opinion** — independent AI score compared to the heuristic.
- **Angle Rewrite** — select a weak factor and let AI rewrite the angle to improve it, with a
  before/after score and a "what changed" note.
- **Launch Twin** — Prediction → Launch → Reality → Learning, with real-metric override and a
  synthetic fallback so the full flow always works.
- **Analytics** — score trends, prediction accuracy, top angles, best platform, factor averages.
- **Leaderboard** — global + your campaigns.
- **Shareable Reports** — public `/report/:id`, copy-link, and print/download.
- **Themes** — Light / Dark / System, persisted across reloads.
- **Voice-to-text** — dictate product / audience descriptions (Web Speech API).
- **How to Use** — in-app walkthrough at `/app/help`.
- **TAS INNOVATORS watermark** — subtle background branding on authenticated pages.

---

## Tech Stack

- **Frontend:** React (CRA + CRACO), Tailwind CSS, shadcn/ui, framer-motion, recharts,
  next-themes, sonner, lucide-react.
- **Backend:** FastAPI (Python), Motor (async MongoDB), PyJWT, passlib/bcrypt.
- **Database:** MongoDB.
- **AI:** Gemini 3 Flash via the Emergent Universal Key (deterministic fallback when offline).

---

## Project Structure

```
/
├── backend/
│   ├── server.py          # FastAPI app + all /api routes
│   ├── auth.py            # JWT + password hashing
│   ├── models.py          # Pydantic models / id + datetime helpers
│   ├── virality.py        # Deterministic 5-factor scoring + prediction/outcome
│   ├── llm_service.py     # AI angle generation, deep analysis, rewrite (+ fallbacks)
│   ├── seed.py            # Idempotent, self-healing demo seeding
│   ├── requirements.txt
│   └── tests/             # pytest backend regression suite
└── frontend/
    ├── src/
    │   ├── pages/         # Landing, Login, Dashboard, CreateLaunch, AudienceDNA,
    │   │                  # Experiments, ExperimentDetail, Leaderboard, Analytics,
    │   │                  # HowToUse, Report
    │   ├── components/    # ViralityScore, DeepAnalysis, AngleRewrite, VoiceButton,
    │   │                  # ThemeToggle, TeamWatermark, PredictionReality, Layout, ui/
    │   ├── context/       # AuthContext
    │   ├── lib/           # api.js (axios instance)
    │   ├── App.js, index.js, index.css
    ├── public/
    ├── package.json
    └── yarn.lock
```

---

## Prerequisites

- **Node.js** ≥ 18 and **Yarn**
- **Python** ≥ 3.11
- **MongoDB** running locally (or a connection string)

---

## Setup & Run (local)

### 1) Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# create your env file from the template and fill in values
cp .env.example .env

# start the API (from the backend/ directory)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The backend seeds a demo user, demo audiences, sample campaigns and a leaderboard on startup
(idempotent + self-healing — it never destroys existing data).

### 2) Frontend

```bash
cd frontend
yarn install

# create your env file from the template and fill in values
cp .env.example .env

# start the dev server
yarn start
```

Open the app at the URL printed by CRA (default `http://localhost:3000`).

### 3) Production build

```bash
cd frontend
yarn build       # outputs an optimized bundle to frontend/build/
```

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list of variable **names**.
No real secrets are included in this export — fill in your own values.

- **Frontend** must call the backend only via `REACT_APP_BACKEND_URL`.
- **Backend** reads Mongo config from `MONGO_URL` + `DB_NAME`.
- **AI** uses `EMERGENT_LLM_KEY`. If it is missing/unavailable, all AI features fall back to
  deterministic output so the app keeps working.

> All backend routes are prefixed with `/api`.

---

## Demo Credentials

- **Email:** `demo@launchloop.ai`
- **Password:** `demo1234`

(There is also an instant demo endpoint: `POST /api/auth/demo`.)

You can override the demo account via the optional `DEMO_EMAIL` / `DEMO_PASSWORD` env vars.

---

## Tests

```bash
cd backend
python -m pytest tests/ -q
```

---

Built with LaunchLoop AI. The virality score is a deterministic, explainable heuristic.
