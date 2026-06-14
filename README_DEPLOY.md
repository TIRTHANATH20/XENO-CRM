Deployment guide — frontend, backend, agents

Local (Docker-compose)

1. Build and run locally:

```bash
docker compose up --build
```

2. Access services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Agents API: http://localhost:8001
- Channel service: http://localhost:8002

Render (recommended for backend + agents)

- A `render.yaml` manifest already exists in the repository. In Render dashboard, connect the repo and import the manifest.
- Add required secrets (Groq API keys, OpenAI keys, etc.) in the Render dashboard for each service.

Vercel (frontend)

- Deploy the `frontend/` directory to Vercel (recommended) — Vercel auto-detects Next.js projects.
- Or deploy frontend as a Docker service on Render or Fly using the provided `frontend/Dockerfile`.

Fly or AWS

- Each service has a Dockerfile. You can publish container images to a registry (Docker Hub, GitHub Container Registry) and deploy to Fly/AWS/GKE/ECS using standard workflows.

Next steps

- I added Dockerfiles and a `docker-compose.yml` for local testing.
- I can deploy to Render + Vercel, or use Fly. You selected Fly — below are Fly-specific steps.

Fly deployment (per-service)

1. Create Fly apps (one per service) or let `flyctl deploy` create them.

2. Set the `FLY_API_TOKEN` secret in GitHub repository secrets (used by the CI workflow I added).

3. Trigger GitHub Actions or run locally:

```bash
# login locally
flyctl auth login

# deploy specific service (from repo root)
flyctl deploy --config backend/fly.toml --remote-only
flyctl deploy --config agents/fly.toml --remote-only
flyctl deploy --config channel-service/fly.toml --remote-only
flyctl deploy --config frontend/fly.toml --remote-only
```

CI (GitHub Actions)

- A workflow is included at `.github/workflows/deploy-fly.yml` that deploys each service on push to `main`. Add `FLY_API_TOKEN` to GitHub secrets before using it.

If you want, I can push a branch and open a PR containing these Fly configs and the workflow.
