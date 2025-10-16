# Explore Agent Integration

The Explore concierge now lives inside the SMS bot with a thin Python/TypeScript bridge.

## Command Surface
- explore <city> [filters]
- explore help
- refine key=value [more filters] (reuses the last Explore session for that phone number)

## Runtime Pieces
- agents/explore/explore_agent.py - main agent logic (ported from the standalone repo)
- agents/explore/runner.py - CLI bridge that loads/saves JSON session state and returns a JSON payload
- agents/explore/index.ts - spawns the Python runner and handles stdout/stderr/timeout logic
- commands/explore.ts - SMS command handler that pipes the inbound message to the agent and sends responses

## Environment
- EXPLORE_AGENT_PYTHON_BIN (optional) overrides the Python executable (defaults to python3.11, falls back to PYTHON_BIN)
- EXPLORE_AGENT_TIMEOUT_MS (optional) overrides the wrapper timeout (default 120000)
- OPENAI_API_KEY powers the LLM summariser inside the agent (falls back to template copy if missing)
- GOOGLE_PLACES_API_KEY fetches fresh venues; without it the agent drops to Wikivoyage/Wikipedia fallback
- Install the requests package inside the Python environment that runs the agent

## Session Persistence
Session files live in data/explore-sessions/<sha1(phone)>.json. The JSON is the minimal session context (city, mode, filters) so refine commands work across separate messages.

## Operational Notes
- The Python runner always prints a single JSON line; the TS wrapper trims and parses it and surfaces stderr when useful.
- Timeouts and process errors bubble up with actionable SMS responses so you can spot missing dependencies quickly.
- Logs include the normalized phone number, error text, and stderr to make debugging production issues easier.
