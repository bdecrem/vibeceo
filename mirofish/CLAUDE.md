# MiroFish — AI Swarm Intelligence Engine

MiroFish predicts and simulates real-world scenarios using multi-agent technology. It builds knowledge graphs from seed data (news, policies, stories), spawns thousands of autonomous AI agents with independent personas and memory, then simulates social dynamics (Twitter/Reddit) to generate predictive reports.

## Quick Start

### Prerequisites
- Node.js >= 18
- Python 3.11–3.12
- `uv` package manager

### Setup

```bash
# 1. Configure environment
cp .env.example .env
# Fill in: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, ZEP_API_KEY

# 2. Install everything
npm run setup:all

# Or step-by-step:
npm run setup          # Node deps + frontend
npm run setup:backend  # Python venv via uv
```

### Run

```bash
npm run dev          # Starts frontend (:3000) + backend (:5001) concurrently

# Or separately:
npm run frontend     # Vue frontend on http://localhost:3000
npm run backend      # Flask backend on http://localhost:5001
```

### Docker Alternative

```bash
cp .env.example .env
docker compose up -d   # Ports 3000 + 5001
```

## Environment Variables (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | API key for any OpenAI SDK-compatible LLM |
| `LLM_BASE_URL` | Yes | LLM endpoint URL |
| `LLM_MODEL_NAME` | Yes | Model name (e.g. `qwen-plus`) |
| `ZEP_API_KEY` | Yes | Zep Cloud API key (free tier works) |
| `LLM_BOOST_API_KEY` | No | Secondary faster LLM for acceleration |
| `LLM_BOOST_BASE_URL` | No | Boost LLM endpoint |
| `LLM_BOOST_MODEL_NAME` | No | Boost model name |

## Project Structure

```
mirofish/
├── frontend/          # Vue 3 + Vite + D3.js
│   └── src/
│       ├── views/     # Page components (Home, MainView, SimulationView, etc.)
│       ├── components/# Step1-5 workflow components, GraphPanel
│       └── api/       # API client modules
├── backend/           # Python Flask
│   ├── run.py         # Entry point (:5001)
│   ├── app/
│   │   ├── api/       # Flask blueprints (graph.py, simulation.py, report.py)
│   │   ├── services/  # Core logic (graph_builder, simulation_runner, etc.)
│   │   ├── models/    # Project & Task persistence
│   │   └── utils/     # LLM client, file parsing, retry helpers
│   └── requirements.txt
├── docker-compose.yml
└── .env.example
```

## 5-Step Workflow

1. **Graph Build** — Upload seed files (PDF/MD/TXT), extract entities, build knowledge graph via GraphRAG + Zep Cloud
2. **Environment Setup** — Generate agent personas from graph entities, configure simulation parameters
3. **Simulation** — Run OASIS multi-agent simulation (Twitter or Reddit platform)
4. **Report Generation** — AI Report Agent analyzes results and generates structured predictions
5. **Deep Interaction** — Chat with any simulated agent, query the report agent for follow-ups

## Key API Endpoints

All under `/api/`:

- `POST /api/graph/upload` — Upload seed files
- `POST /api/graph/generate-ontology` — Extract entities & relationships
- `POST /api/graph/build-graph` — Build knowledge graph (async, returns task_id)
- `GET /api/graph/task-status/<task_id>` — Check task progress
- `POST /api/simulation/start` — Begin simulation
- `GET /api/simulation/status/<id>` — Simulation progress
- `POST /api/simulation/interview` — Chat with a simulated agent
- `POST /api/report/generate` — Generate prediction report
- `POST /api/report/interact` — Query report with follow-up questions
- `GET /health` — Health check

## Tech Stack

- **Frontend:** Vue 3, Vite, Vue Router, Axios, D3.js
- **Backend:** Flask 3.0+, OpenAI SDK, Zep Cloud, Pydantic 2.0
- **Simulation:** CAMEL-AI OASIS framework (`camel-oasis`, `camel-ai`)
- **Document parsing:** PyMuPDF (PDF), Markdown, plain text

## Tips

- Start with < 40 simulation rounds to control LLM costs
- LLM consumption can be high — Alibaba Qwen-plus is recommended for cost efficiency
- Zep Cloud free tier is sufficient for basic usage
- The backend runs Flask in debug mode by default (`FLASK_DEBUG`)
- Data is stored in `backend/uploads/projects/` and `backend/uploads/simulations/`
