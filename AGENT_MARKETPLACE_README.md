# SMS Agent Marketplace

## Overview

A complete marketplace system that allows SMS users to discover, subscribe to, and create their own AI agents via text message.

**Key Features:**
- 🔐 **Magic Link Authentication** - SMS users can access the web marketplace via secure one-time links
- 📱 **SMS Command "AGENTS"** - Text "AGENTS" to get instant marketplace access
- 🛒 **Browse Public Agents** - Discover AI agents created by the community
- ✅ **Subscribe/Unsubscribe** - Add agents to your account with one click
- 🎨 **Visual Agent Builder** - Create custom agents with a drag-and-drop workflow editor
- 📊 **Agent Versioning** - Full version history and change tracking
- 👤 **Creator Attribution** - Each agent tracks its creator and usage

---

## Architecture

### Database Schema

The system uses the existing `agents`, `agent_versions`, and `subscriptions` tables from migration `008_kochi_intelligence_agents.sql`, plus a new table for magic links:

#### New Table: `agent_marketplace_tokens`
```sql
CREATE TABLE agent_marketplace_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  accessed_count INTEGER DEFAULT 0
);
```

#### Existing Tables Used:
- **`agents`** - Stores agent metadata (name, slug, description, status, creator)
- **`agent_versions`** - Stores workflow definitions as JSONB (versioned)
- **`subscriptions`** - Links users to agents they've subscribed to
- **`sms_subscribers`** - User accounts with phone numbers

---

## User Flow

### 1. SMS User Requests Access

User sends: **"AGENTS"**

System responds:
```
🤖 AGENT MARKETPLACE

Browse public agents, add them to your account, or create your own:

https://yourdomain.com/agents/marketplace?token=abc123...

Link expires in 1 hour.
```

### 2. User Opens Marketplace

- Link verifies phone number
- Shows all approved public agents
- Shows subscription status for each agent
- Displays categories and featured agents

### 3. User Subscribes to Agents

- Click "Subscribe" on any agent
- Agent is added to their account
- They'll receive updates from that agent

### 4. User Creates Agent (Optional)

- Click "Create Agent"
- Opens visual workflow builder
- Drag and drop nodes to build pipeline
- Save to marketplace (pending approval)

---

## API Endpoints

### Authentication

**POST `/api/agents/generate-magic-link`**
```json
{
  "phone_number": "+15551234567"
}
```
Response:
```json
{
  "success": true,
  "magic_link": "https://yourdomain.com/agents/marketplace?token=...",
  "expires_at": "2025-11-26T12:00:00Z",
  "subscriber": {
    "phone": "+15551234567",
    "slug": "wildeagle",
    "email": "user@example.com"
  }
}
```

**GET `/api/agents/verify-magic-link?token=xxx`**

Verifies token and returns subscriber info.

---

### Marketplace

**GET `/api/agents/marketplace?phone_number=xxx&category=xxx&featured=true`**

Lists all approved public agents. Includes `isSubscribed` flag if phone_number provided.

**POST `/api/agents/marketplace`**

Create a new agent:
```json
{
  "name": "Tech News Digest",
  "description": "Daily tech news from top sources",
  "category": "news",
  "definition_jsonb": { ... },
  "phone_number": "+15551234567"
}
```

---

### Subscriptions

**POST `/api/agents/subscribe`**

Subscribe to an agent:
```json
{
  "agent_id": "uuid",
  "phone_number": "+15551234567"
}
```

**DELETE `/api/agents/subscribe`**

Unsubscribe from an agent (same body as POST).

**GET `/api/agents/subscribe?phone_number=xxx`**

List all active subscriptions for a user.

---

## Frontend Pages

### `/agents/marketplace` - Marketplace Browser

**Features:**
- Magic link token verification
- Category filtering
- Subscribe/unsubscribe buttons
- Featured agent badges
- Link to create new agents

**UI Components:**
- Gradient background (slate-900 to purple-900)
- Glass-morphic cards
- Responsive grid layout
- Real-time subscription status

### `/agents/new` - Agent Builder

**Features:**
- Visual workflow editor (n8n-style)
- Drag-and-drop node palette
- Node configuration panel
- Code view (TypeScript/Python/JSON)
- Magic link authentication support
- Marketplace publishing

**Workflow Nodes:**
- **Sources**: RSS, API, Twitter, Reddit, arXiv, etc.
- **Filters**: Keyword, date, sentiment, score, etc.
- **Transforms**: LLM summarize, Claude agent, entity extraction
- **Outputs**: SMS, email, report, webhook

---

## SMS Command Handler

Location: `/sms-bot/lib/sms/handlers.ts` (line ~2673)

```typescript
if (messageUpper === "AGENTS") {
  // Generate magic link via API
  const response = await fetch(`${baseUrl}/api/agents/generate-magic-link`, {
    method: 'POST',
    body: JSON.stringify({ phone_number: normalizedPhoneNumber })
  });

  const data = await response.json();

  // Send link via SMS
  await sendSmsResponse(
    from,
    `🤖 AGENT MARKETPLACE\n\nBrowse public agents...\n\n${data.magic_link}\n\nLink expires in 1 hour.`,
    twilioClient
  );
}
```

Added to help text in COMMANDS response:
```
🤖 AGENT MARKETPLACE:
• AGENTS - Browse & manage agents
```

---

## Security

### Magic Link Token Security

- **Random tokens**: 32 bytes (64 hex chars) generated with `crypto.randomBytes`
- **1-hour expiration**: Tokens expire after 60 minutes
- **Single-use recommended**: Tokens track usage count
- **Phone number verification**: Token must match registered phone
- **Auto-cleanup**: Expired tokens deleted after 7 days

### Row Level Security (RLS)

Agents table policies:
- ✅ Public can view **approved** agents only
- ✅ Creators can view/edit their own agents
- ✅ Creators can create new agents (starts as "draft")

Subscriptions table policies:
- ✅ Users can only view their own subscriptions
- ✅ Users can create subscriptions to approved agents only

---

## Database Migration

**File:** `/sms-bot/migrations/010_agent_marketplace_magic_links.sql`

To apply migration:
```bash
cd /vibeceo/sms-bot
psql $DATABASE_URL -f migrations/010_agent_marketplace_magic_links.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of migration file
3. Run

---

## Workflow Definition Format

Agents are stored as JSONB in `agent_versions.definition_jsonb`:

```json
{
  "name": "Daily Tech News",
  "schedule": {
    "enabled": true,
    "cron": "0 7 * * *"
  },
  "pipeline": [
    {
      "kind": "rss_source",
      "feedUrl": "https://news.ycombinator.com/rss",
      "maxItems": 50
    },
    {
      "kind": "keyword_filter",
      "keywords": ["AI", "startup", "tech"],
      "mode": "include",
      "field": "title"
    },
    {
      "kind": "llm_summarize",
      "instruction": "Summarize in one sentence"
    },
    {
      "kind": "sms_output",
      "template": "📰 {{title}}\n\n{{summary}}"
    }
  ]
}
```

---

## Testing

### End-to-End Test Flow

1. **Setup Test User**
   ```bash
   # Ensure phone number exists in sms_subscribers table
   # For testing, use your own phone number
   ```

2. **Test SMS Command**
   - Send "AGENTS" to your Twilio number
   - Verify you receive a magic link

3. **Test Marketplace Access**
   - Click the magic link
   - Verify marketplace loads with your account info
   - Check that you see approved agents (if any exist)

4. **Test Subscription**
   - Click "Subscribe" on an agent
   - Verify success message
   - Refresh page and verify "Subscribed" badge shows

5. **Test Agent Creation**
   - Click "Create Agent"
   - Add some workflow nodes
   - Click Save
   - Enter category and description
   - Verify agent is created as "draft"

---

## Environment Variables Required

```bash
# In /web/.env.local
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # or http://localhost:3002 for dev

# In /sms-bot/.env.local
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # Used by SMS handler

# Already configured:
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

---

## Future Enhancements

### Phase 1 (Completed)
- ✅ Magic link authentication
- ✅ SMS "AGENTS" command
- ✅ Marketplace browsing
- ✅ Subscribe/unsubscribe
- ✅ Agent creation via visual editor

### Phase 2 (Future)
- 🔲 Agent approval workflow (admin dashboard)
- 🔲 Agent execution history and metrics
- 🔲 Agent ratings and reviews
- 🔲 Paid agents (Stripe/LemonSqueezy integration)
- 🔲 Agent categories and tags
- 🔲 Search and filtering improvements
- 🔲 Agent templates (pre-built workflows)
- 🔲 Collaborative editing
- 🔲 Agent marketplace analytics

### Phase 3 (Advanced)
- 🔲 Agent SDK for programmatic creation
- 🔲 Agent testing framework
- 🔲 Agent marketplace API for third-party integrations
- 🔲 Agent A/B testing
- 🔲 Agent monetization dashboard

---

## Troubleshooting

### "Invalid or expired token"
- Magic links expire after 1 hour
- Solution: Text "AGENTS" again to get a new link

### "Subscriber not found"
- Phone number not in database
- Solution: Text "START" first to create account

### "Agent is not available for subscription"
- Agent status is not "approved"
- Solution: Only approved agents can be subscribed to

### "Failed to create agent"
- Check browser console for errors
- Verify all required fields are filled
- Ensure workflow has at least one source and one output node

---

## File Structure

```
vibeceo/
├── sms-bot/
│   ├── lib/sms/handlers.ts              # SMS command handler (AGENTS)
│   └── migrations/
│       ├── 008_kochi_intelligence_agents.sql    # Main agent tables
│       └── 010_agent_marketplace_magic_links.sql # Magic link tokens
│
└── web/
    ├── app/
    │   └── api/
    │       └── agents/
    │           ├── generate-magic-link/route.ts   # Create magic link
    │           ├── verify-magic-link/route.ts     # Verify magic link
    │           ├── marketplace/route.ts           # List & create agents
    │           └── subscribe/route.ts             # Subscribe/unsubscribe
    └── app/agents/
        ├── marketplace/page.tsx         # Marketplace browser UI
        └── new/page.tsx                 # Agent builder UI (modified)
```

---

## Credits

Built on top of:
- **Kochi Intelligence Platform** - Agent execution infrastructure
- **React Flow** - Visual workflow editor
- **Supabase** - Database and auth
- **Twilio** - SMS messaging
- **Next.js** - Frontend framework

---

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the agent logs in Supabase
3. Check SMS bot logs
4. Open an issue on GitHub

---

*Last Updated: 2025-11-26*
