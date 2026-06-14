# CRM — AI-Native Customer Engagement Platform

This repository contains the Xeno CRM take-home assignment for the FDE Internship Drive 2026.
It is organized as a full-stack demo product with a clean frontend, Python backend, multi-agent AI service, and simulated channel delivery service.

## What is included

- `frontend/` — Next.js 16 + React + TypeScript + Tailwind CSS user interface
- `backend/` — FastAPI backend with SQLite data storage and REST API endpoints
- `agents/` — AI assistant agent layer used for routing chat prompts and generating segment recommendations
- `channel-service/` — stubbed delivery simulator for campaigns and receipts
- `scripts/start-all.sh` — helper script to start all services locally in one command

## Key product capabilities

- Customer search, profile and digital twin views
- Segment creation, refresh, and customer membership management
- Campaign creation and channel dispatch simulation
- AI assistant support for segmentation and campaign guidance
- Basic analytics and performance metrics for CRM actions
- Demo data ingestion with sample customer/order uploads

## Local development

### Prerequisites

- Node.js 20+
- Python 3.10+
- `npm` or `pnpm`
- Optional: `ollama` if you want the AI routes to use local models

### Run locally

Open four terminals or use the helper script:

**Terminal 1 — Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Terminal 2 — Channel Service**

```bash
cd channel-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

**Terminal 3 — Agents**

```bash
cd agents
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn api:app --reload --port 8003
```

**Terminal 4 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

Alternatively, run the startup helper:

```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

### Access the app

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8001`
- Channel simulator: `http://localhost:8000`
- Agent service: `http://localhost:8003`

## Environment variables

The repository does not store secret environment variables in git.
The following environment variables are used by the app:

- `GROQ_API_KEY` — AI/OpenAI key for Groq chat fallback
- `CRM_API_URL` — backend API URL for local development
- `NEXT_PUBLIC_CRM_API_URL` — frontend backend API target
- `NEXT_PUBLIC_AGENTS_API_URL` — frontend agents service target

For local development, add the values to ignored `.env` files in the appropriate subfolders.

## Deployment notes

This project is designed for deployment as a split frontend/backend app:

- Frontend can be deployed to Vercel, Netlify, or any static/Next.js host
- Backend can be deployed to Railway, Render, or any Python host
- AI/agent service can be deployed separately or run alongside the backend
- Channel service is a simulator and should run as a separate service if needed

### Deploy frontend to Vercel (recommended)

1. Install Vercel CLI (optional, you can also use the web UI):

```bash
npm i -g vercel
```

2. From the `frontend/` folder, link or create a Vercel project and deploy:

```bash
cd frontend
vercel login
vercel link   # connect to an existing project or create a new one
vercel --prod
```

3. Set required environment variables in the Vercel dashboard (Project → Settings → Environment Variables):

- `NEXT_PUBLIC_CRM_API_URL` — set to your backend URL (e.g. `https://your-backend.example.com`)
- `NEXT_PUBLIC_AGENTS_API_URL` — set to your agents service URL if deployed (optional)
- `GROQ_API_KEY` — **server-side** Groq key (only set this if you want Groq fallback in `api/chat`)

Notes:

- The `GROQ_API_KEY` is a secret and should be set in Vercel's dashboard as a Project Secret (do NOT commit it to the repo).
- If your backend and agents are not deployed, some AI features will fall back to the local agent service when run locally; for a fully hosted demo you should deploy backend and agents as well.

### Important deployment rule

**Do not commit secrets to GitHub.**
Set `GROQ_API_KEY` and other secrets in your deployment provider's environment variable settings.

## Submission checklist

- Ensure `frontend/`, `backend/`, `agents/`, and `channel-service/` are separated clearly
- Keep local `.env` files out of git
- Share public GitHub repo links to both frontend and backend code
- Host the frontend app publicly and share the URL
- Record a short walkthrough video and transcript

## Repo structure

```text
Xeno/
├── agents/             # AI agent service and tools
├── backend/            # FastAPI backend and database
├── channel-service/    # Campaign delivery simulator
├── frontend/           # Next.js UI and API client
├── scripts/            # helper scripts
├── .gitignore
├── README.md
├── SUBMISSION_CHECKLIST.md
└── TESTING_CHECKLIST.md
```

## Notes

This repository has already been cleaned to avoid committing local build artifacts and secrets.
The local `.env` files and developer artifacts are ignored and will not be pushed.
