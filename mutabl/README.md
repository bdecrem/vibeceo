# mutabl

Apps that evolve — users chat with their app to grow new features in real time.

## Apps

| App | Status | Path | What |
|-----|--------|------|------|
| **todoit** | Live | `web/app/mutabl/todoit/` | Personal todo app shaped by AI |
| **contxt** | Planned | `web/app/mutabl/contxt/` | Context that keeps up |

## Architecture

Each mutabl app follows the same pattern:

1. **AuthGate** — lightweight handle-based auth
2. **AppRenderer** — renders user's app from AI-generated React code via `react-live`
3. **ChatPanel** — floating chat widget that sends requests to an agent endpoint
4. **Agent endpoint** — rewrites the app's source code based on the user's message

Shared components live in `web/app/mutabl/components/`.

## Landing Page

`web/app/mutabl/page.tsx` — animated logo + app directory.
