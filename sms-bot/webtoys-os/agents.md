# WebtoysOS Agents Guide

This guide distills the essential rules and working patterns for agents building and fixing WebtoysOS apps. It combines the strict rules from `claude.md`, today’s implementation lessons, and references to deeper docs under `sms-bot/documentation/`.

## Scope and Architecture

- WebtoysOS is a “super Webtoys app” that runs as a desktop in the browser; apps live in the database, not the filesystem.
- Local files under `sms-bot/webtoys-os/apps/` are templates used for development; deployment writes HTML into Supabase (`wtaf_content`) and updates the desktop config (`wtaf_desktop_config`).
- Always deploy via scripts — never edit Supabase content directly.
- Reference: `sms-bot/documentation/webtoys-os.md` for OS overview and tables, and `sms-bot/documentation/ZAD-API-SYSTEM-OVERVIEW.md` for ZAD fundamentals.

## Security and Secrets

- Never hardcode secrets. Use environment variables from `.env.local` in `sms-bot/` for server-side scripts.
- In browser apps use the public Supabase anon key (publishable `sb_publishable_...` form) and add `crossorigin="anonymous"` to CDN scripts used in iframes.
- Do not expose the Supabase service key in client code — server-side only.
- See: `claude.md` and `sms-bot/documentation/security_practices.md`.

## Deployment Rules (Critical)

- Use the auto‑deploy script to deploy an app and register it on the desktop:
  - From `sms-bot/webtoys-os/`: `node scripts/auto-deploy-app.js apps/<file>.html [icon]`
  - The script:
    - Backs up the existing app HTML to `webtoys-os/backups/apps/`
    - Upserts `wtaf_content (user_slug='public', app_slug='toybox-<name>')`
    - Updates `wtaf_desktop_config.app_registry` and `icon_positions`
- Never modify Supabase content manually. Backups are your safety net.
- Provide window sizing via a meta tag in app HTML so the desktop window is correct:
  - `<meta name="window:<slug>" content="width=800,height=600,resizable=true">`

## ZAD Save/Load Pattern (Apps)

Apps must use the ZAD API — no direct Supabase access. Copy this exact pattern and adapt `APP_ID` and `action_type` to your app.

```html
<script>
// Identity
window.APP_ID = 'your-app-id'; // e.g., 'toybox-text-editor'
function getAppId() { return window.APP_ID || 'your-app-id'; }

// Auth helpers (desktop broadcasts TOYBOX_AUTH)
function getUsername() { return (window.currentUser?.handle || 'anonymous').toUpperCase(); }
function getParticipantId() {
  if (!window.currentUser) return 'anonymous_0000';
  return window.currentUser.participantId || `${getUsername()}_${window.currentUser.pin || '0000'}`;
}

// Save
async function zadSave(dataType, data) {
  const app_id = getAppId();
  const participant_id = getParticipantId();
  const username = getUsername();
  const res = await fetch('/api/zad/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id, participant_id,
      participant_data: { userLabel: username, username },
      action_type: dataType,
      content_data: { timestamp: Date.now(), author: username, ...data }
    })
  });
  if (!res.ok) throw new Error('Save failed');
  return true;
}

// Load (flattened)
async function zadLoad(dataType) {
  const url = `/api/zad/load?app_id=${encodeURIComponent(getAppId())}&action_type=${encodeURIComponent(dataType)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Load failed');
  const data = await res.json();
  return (data || []).map(item => ({
    id: item.content_data?.id || item.id,
    title: item.content_data?.title,
    content: item.content_data?.content,
    author: item.content_data?.author || item.participant_data?.username || item.participant_data?.userLabel || 'Unknown',
    updatedAt: item.content_data?.updatedAt || item.created_at,
    created_at: item.created_at,
    participant_id: item.participant_id
  }));
}

// Per-user filter + dedupe by id (latest updatedAt wins)
async function loadUserItems(dataType) {
  const mine = (await zadLoad(dataType)).filter(d => d.participant_id === getParticipantId());
  const latest = {};
  for (const d of mine) {
    const ts = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    if (!latest[d.id] || ts > latest[d.id].ts) latest[d.id] = { ts, ...d };
  }
  return Object.values(latest).sort((a,b) => b.ts - a.ts);
}
</script>
```

Examples using this exact pattern today:
- Rhymes app (`apps/rhymes.html`): saves/opens `poem_document` per user.
- Text Editor (`apps/text-editor.html`): updated to match Rhymes; uses `document` action type.

## Authentication Pattern (Apps)

- Desktop manages auth; apps listen for `TOYBOX_AUTH` and may pre-load from `localStorage('toybox_user')`.
- Normalize user:
  - Uppercase `handle`
  - Ensure `participantId = HANDLE_PIN` if not provided
- Never implement custom login UIs in apps.
- Reference: `agents/edit-agent/AUTH-DOCUMENTATION.md` and `claude.md`.

## Desktop Integration

- Desktop config table: `wtaf_desktop_config` (public default row has `user_id = null`, `desktop_version = 'webtoys-os-v3'`).
- Auto‑deploy updates:
  - `app_registry`: `{ id, name, url, icon, width, height, resizable, category }`
  - `icon_positions`: automatically assigned if not set
- To remove apps from the desktop, prefer dedicated scripts in `webtoys-os/scripts/` (e.g., `cleanup-desktop.js`, `remove-*-app.js`).

## Iframe, CDN and CORS

- Apps are often rendered in an iframe (including `srcdoc`), so CDN scripts must include `crossorigin="anonymous"` to avoid CORS issues.
- Use the Supabase anon key in clients; service key is server‑only.

## UI and Window Sizing

- Provide a `<meta name="window:<slug>" content="width=...,height=...,resizable=...">` tag; the deployer reads it to register size.
- Windows should wrap tightly around app content. Avoid extra padding that forces oversized windows.

## Refresh and Live Updates

- Avoid disruptive auto-refresh patterns that re-render large sections during user interaction.
- Prefer explicit Refresh buttons or targeted updates to specific regions.
- Example change: Issue Tracker v3 removes interval and visibility-change refresh; keeps explicit Refresh.

## Agent Prompting (Edit Agent)

- The edit agent injects ZAD and auth guidance automatically (see `agents/edit-agent/execute-open-issue-v2.js`).
- If an app needs persistence, ensure the prompt includes:
  - The ZAD helpers block above
  - `window.APP_ID` set correctly
  - Action types that match the domain (`document`, `poem_document`, `leaderboard`, etc.)

## References

- Core rules: `sms-bot/webtoys-os/claude.md`
- OS architecture: `sms-bot/documentation/webtoys-os.md`
- ZAD overview: `sms-bot/documentation/ZAD-API-SYSTEM-OVERVIEW.md`
- Security practices: `sms-bot/documentation/security_practices.md`
- Edit agent internals: `sms-bot/webtoys-os/agents/edit-agent/`

