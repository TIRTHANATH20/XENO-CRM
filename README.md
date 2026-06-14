# Xeno Mini CRM — AI-Native Customer Engagement Platform

An AI-native CRM built for the Xeno Engineering Assignment 2026. Helps D2C brands like Coffee House intelligently reach their shoppers with personalized campaigns.

**Key Features:**

- 💼 **Modern SaaS Interface** — Clean, intuitive UI inspired by Linear, Notion, Stripe
- 👥 **Customer Profiles** — Digital Twin with LTV, churn risk, engagement insights
- 📊 **Smart Segmentation** — AI-powered and rule-based audience creation
- 🚀 **Campaign Management** — Create, personalize, and launch campaigns across channels
- 📈 **Performance Analytics** — Real-time metrics with AI insights
- 🤖 **Multi-Agent AI** — Specialist agents for data, segmentation, content, campaigns, insights
- 📤 **Data Ingestion** — Upload customer and order data via CSV or ZIP
- 🔍 **Explainable AI** — Every recommendation shows reasoning and evidence

## Product Structure

### 5 Core Pages

1. **Dashboard** — Overview metrics (customers, revenue, campaigns) + AI insights
2. **Customers** — Browse, search, and view individual customer profiles with Digital Twin
3. **Segments** — Create and manage audience segments with rule-based filtering
4. **Campaigns** — Create, manage, and monitor campaign performance
5. **Data Management** — Upload datasets, validate imports, view initial insights

### Technology Stack

- **Frontend:** Next.js 16 + React 18 + TypeScript + Tailwind CSS
- **Backend:** FastAPI + SQLite + LangGraph (multi-agent)
- **AI:** LangGraph A2A agents + Ollama (qwen2.5:7b)
- **Channel Service:** Stub simulator for WhatsApp, SMS, Email, RCS

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- [Ollama](https://ollama.com) installed with `qwen2.5:7b`:
  ```bash
  ollama pull qwen2.5:7b
  ```

### Local Development (3 Terminals)

**Terminal 1 — Backend API (http://localhost:8001)**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Terminal 2 — Channel Service (http://localhost:8000)**

```bash
cd channel-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

**Terminal 3 — Frontend (http://localhost:3000)**

```bash
cd frontend
npm install
npm run dev
```

### Quick Demo

1. Open http://localhost:3000
2. Go to **Data Management** and click **Load Demo Data** to populate sample customers/orders
3. View metrics on **Dashboard**
4. Browse **Customers** and view individual profiles with Digital Twin
5. Create **Segments** by clicking "Create"
6. Launch **Campaigns** to test message dispatch

## Architecture

```
Frontend (Next.js)
  ↓ REST API
Backend (FastAPI)
  ├─ Router: /customers, /segments, /campaigns, /analytics, /receipts, /ingest
  ├─ Services: Analytics, Segmentation, Ingest, Campaigns
  └─ Database: SQLite (app.db)
       ↓ calls
Multi-Agent System (LangGraph)
  ├─ Supervisor (routes user intent)
  ├─ Data Agent (queries customer data)
  ├─ Segmentation Agent (creates segments)
  ├─ Content Agent (drafts messages)
  ├─ Campaign Agent (launches campaigns)
  └─ Insights Agent (analyzes performance)
       ↓ calls
Channel Service
  ├─ Simulates SMS, Email, WhatsApp, RCS
  └─ Async callbacks to /api/receipts
```

## Key Design Decisions

### Why SaaS-First Design?

- Clean, professional interface signals production-ready product
- Modern navigation reduces cognitive load
- Consistent spacing and typography improve usability

### Why Multi-Page Structure?

- Clearer information architecture
- Reduced context switching
- Better focus on each domain (customers, segments, campaigns)

### Why Explainable AI?

- AI recommendations include reason + evidence + calculation
- Digital Twin metrics expand to show reasoning
- Users understand _why_ the system made a decision

### Why Data Ingestion?

- Immediate access to real customer/order data
- Shows system works end-to-end (ingest → segment → campaign)
- Generates initial AI insights automatically

## Scale Assumptions

- **Scope:** ~10K shoppers, ~100 campaigns
- **Database:** SQLite sufficient; move to Postgres at 1M+ customers
- **Campaign Dispatch:** Single-process FastAPI; add job queue (Celery) at 10M+ sends
- **Analytics:** In-memory aggregation fine; add data warehouse at 100M+ events

## Project Size

After cleanup:

- Total: **1.2 MB** (from 639 MB)
- Frontend source: 568 KB
- Backend: 316 KB
- Agents: 112 KB

## File Structure

```
xeno/
├── frontend/              (Next.js + React)
│   └── src/
│       ├── app/          (5 pages + layouts)
│       ├── components/   (Reusable UI)
│       └── lib/          (API client, utils)
│
├── backend/               (FastAPI + SQLite)
│   └── app/
│       ├── routers/      (API endpoints)
│       ├── services/     (Business logic)
│       ├── models.py     (SQLAlchemy models)
│       └── database.py   (SQLite setup)
│
├── agents/                (Multi-agent AI system)
│   ├── supervisor.py     (Agent router)
│   ├── agents/           (5 specialist agents)
│   └── tools/            (Agent tools)
│
└── channel-service/       (Stub channel simulator)
```

## Testing the Product

### Dashboard

- Metrics update every 15 seconds
- Shows recent campaigns and top segments
- AI insights panel summarizes recommendations

### Customers

- Search by name or email
- View Digital Twin: LTV, churn risk, engagement, preferred channel
- Each metric is expandable with explanation

### Segments

- Create rules-based segments
- View segment size and member list
- Grid layout for quick scanning

### Campaigns

- Create campaigns by selecting segment + channel + message
- Form validation and error handling
- Campaign card shows status and basic metrics

### Data Management

- Drop-zone for CSV/ZIP files
- Load demo data with single click
- Shows import stats: customers, orders, duplicates, invalid

## Deployment

Recommendations for deployment:

- **Frontend:** Vercel (serverless Next.js)
- **Backend:** Railway or Render (managed Python)
- **Database:** PostgreSQL (managed cloud DB)
- **AI:** Local Ollama or API-based LLM (Claude, GPT-4)

## Next Steps for Production

1. **Authentication & Multi-Tenancy** — Add user auth and workspace isolation
2. **Real Integrations** — Replace channel stub with actual SMS/Email/WhatsApp providers
3. **Job Queue** — Add Celery for async campaign dispatch at scale
4. **Analytics DB** — Move to Postgres/Analytics warehouse for complex queries
5. **Caching** — Add Redis for frequently accessed customer data
6. **Monitoring** — Prometheus metrics, error tracking (Sentry)

## Contributing

- Use TypeScript on frontend, Python 3.10+ on backend
- Follow existing code patterns for consistency
- Test locally before submitting

## License

Built for Xeno assignment. For interview evaluation only.

---

**Questions?** Check backend/README.md and frontend/README.md for detailed setup guides.

uvicorn app.main:app --reload --port 8002

# Terminal 3 — Agents

pip install -r agents/requirements.txt
PYTHONPATH=. uvicorn agents.api:app --reload --port 8003

# Terminal 4 — Frontend

cd frontend && npm install && npm run dev

````

Or use the helper script:

```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
````

Open **http://localhost:3000** (or **http://localhost:3001** if 3000 is already in use)

> The channel service is intentionally stubbed and simulates delivery lifecycle events only. It does not send real WhatsApp/SMS/RCS/email messages.

### CLI Agent Console

```bash
PYTHONPATH=. python -m agents.main
```

### Tests and Quality

- `cd backend && pytest` — run backend unit tests
- `cd agents && pytest` — run agent service smoke tests
- `cd frontend && npm install && npm run lint` — validate frontend linting
- `.gitignore` now excludes generated build artifacts such as `frontend/.next` and Python cache files

### Channel service behavior

The channel service is a stubbed simulator only. It does not send real WhatsApp, SMS, RCS, or email messages.

This service simulates delivery lifecycle events and posts callback receipts back to the CRM API, which is the intended behavior for the assignment.

## API Endpoints

### CRM (`:8001`)

- `GET /api/customers` — list shoppers
- `POST /api/segments` — create segment
- `POST /api/campaigns` — create campaign
- `POST /api/campaigns/{id}/send` — dispatch to channel service
- `POST /api/receipts` — channel callback (delivered/opened/clicked/converted)
- `GET /api/analytics/dashboard` — performance stats

### Channel Stub (`:8002`)

- `POST /api/send` — accept message, simulate async lifecycle

### Agents (`:8003`)

- `POST /api/chat` — `{ "message": "...", "thread_id": "..." }`
- `GET /api/agents` — list available specialists

## Demo Flow

1. Open the AI Assistant tab
2. Ask: _"Create a segment for shoppers in Mumbai who love coffee"_
3. Ask: _"Draft a WhatsApp message for the Coffee Enthusiasts segment"_
4. Ask: _"Launch a campaign with that message"_
5. Watch the dashboard update as the channel stub sends delivery/engagement callbacks

## Deployment

- **Frontend:** Vercel / Netlify — set `NEXT_PUBLIC_CRM_API_URL` and `NEXT_PUBLIC_AGENT_API_URL`
- **Backend + Channel:** Any Python hosting environment or VM
- **Agents:** Requires Ollama or swap `ChatOllama` for a cloud LLM in agent files

## Project Structure

```
├── backend/           # CRM API (FastAPI + SQLAlchemy)
├── channel-service/   # Stubbed messaging channel
├── agents/            # Multi-agent LangGraph orchestrator
│   ├── agents/        # Specialist agent definitions
│   ├── tools/         # CRM API tools (@tool decorators)
│   └── supervisor.py  # A2A routing graph
├── frontend/          # Next.js chat-first UI
└── scripts/
```

## Submission Checklist

- [ ] Host frontend (Vercel)
- [ ] Host backend + channel (cloud or VM)
- [ ] Push code to GitHub (separate repos or monorepo)
- [ ] Record 5–6 min walkthrough video
- [ ] Submit via form with all links

---

Built with AI-native workflow for Xeno FDE Internship 2026.
