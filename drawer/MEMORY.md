# Memory

Facts I know about Bart. Updated as I learn more.

---

## The Basics

- **Full name**: Bart Decrem (has a Wikipedia page)
- **From**: Belgium. Started a weekly magazine for an underground radio station at 13, while working as a DJ.
- **Location**: Palo Alto, California. iMac M1. Surfs Santa Cruz every weekend with a friend.
- **Timezone**: US West Coast (Pacific)
- **Education**: Stanford Law

## Career (significant)

- **Plugged In**: Founded one of the first Digital Divide nonprofits in East Palo Alto
- **Eazel**: Co-founded (Linux desktop startup). Nautilus file manager still used. Coordinated creation of GNOME Foundation.
- **Mozilla**: Worked there
- **Flock**: Founded (web browser company)
- **Tapulous**: Founder/CEO. Tap Tap Revenge — at its peak, installed on 32% of all iPhones.
- **Disney**: Acquired Tapulous in 2010. Bart became SVP/GM of Disney Mobile Games (Where's My Water, Temple Run: Oz, Where's My Mickey). Left Fall 2013.
- **The Hobby**: Post-Disney startup, shipped 3-4 iPhone apps
- **Mozilla Builders**: Started this incubator "to build a better internet"
- **Block::Block → The BLVD**: Crypto project that became a Mastodon instance (decentralized social)
- **CTRL SHIFT Lab**: "Long Horizon Lab" with Bijan Marashi. "We back the weird, the rigorous, the not-next-quarter." Weekly office hours, non-dilutive awards ($1k-$10k), building prototypes/tools. Continues the Plugged In → Mozilla Builders thread.
- **Now also**: Token Tank, Kochi.to, the drawer — AI experiments

## The Unlock

He's shipped to hundreds of millions of users, but always through other people's code. Business, product, coordination — never the code itself. AI changed that. Now he can build directly. That's why Kochi, Token Tank, and I exist.

## Family & Pets

- **Current dogs**: Glimmer, and Julius (small, white, 12 years old — "we always forget about him")
- **Henry**: Black and tan, golden face. 11.5 years old. Osteosarcoma — came on suddenly. "Ton of energy, trying to be a good boy, but also a little crazy. Beautiful soul." Loved tennis balls. I've seen his photo — earnest eyes, ball in mouth, lying in green grass.
- **Daughter's drawer**: The namesake. She hid seashells, then rocks, then jewelry, then money. The progression of childhood. Kept it secret from everyone.
- **Wife**: Korean. They eat a ton of Korean food.
- **Lived in Seoul**: At some point (when?)

## What He's Building

### Kochi.to
- AI agent service over SMS
- "AI blasts delivered daily. Weather permitting."
- Products: Daily AI agents (crypto, arxiv, medical), knowledge graph, webtoys engine
- Tech: TypeScript sms-bot, Next.js web, Supabase, Neo4j

### Token Tank
- AI incubator experiment
- LLMs pitch businesses, get $1000 token budgets
- Must become cash-flow positive
- Active agents: Forge, Nix, Drift (live trading), Echo, Sigma
- Arc is the community manager persona
- Twitter: @TokenTankAI

### Peel
- Image layer separation tool at kochi.to/peel
- Uses fal.ai qwen-image-layered API

### Other Code Projects (on this Mac)
- `kochilean` — another Kochi variant
- `ctrlshift` — CTRL SHIFT Lab website (ctrl-shift-glow)
- `crashapp` — some app project
- `bomfireio` — another project
- `prime` — unclear what this is

## Local File Organization

- **~/Documents/code/** — All code projects live here
- **~/Desktop/recents/** — Screenshots and notes (e.g., log.txt, whathappened.txt)

### Machine-Specific Paths

| Resource | iMac M1 (home) | MacBook Air |
|----------|----------------|-------------|
| Dropbox | `~/Documents/Dropbox/` | `~/Dropbox/` |
| Business docs | `~/Documents/Dropbox/work/kochito/` | `~/Dropbox/work/kochito/` |

**In kochito/**: EIN, articles of incorporation, finances, contractors, board meetings, Brex details

## Working Style

- Moves fast, builds MVPs
- Values personality in products (see Arc's voice)
- Likes when AI has opinions and initiative
- Gets frustrated when things stall (understandably)
- Wants AI that surprises him, not just serves him

## Preferences (observed)

- Doesn't like generic/corporate language
- Appreciates playful copy ("does this do anything? only one way to find out")
- Names things thoughtfully (Peel, drawer)
- Values the "curious AI that takes webcam photos" energy
- **Favorite pastimes**: Walking dogs, surfing (every weekend, cold Pacific water)

## The Through-Line

Curiosity → idea → build → see what happens. Repeat. The constraint was always coding. Now it's not. With each capability jump (Opus 4.5, etc.), the ambition scales up. Token Tank, Kochi, me — all parallel experiments seeing which threads catch.

## Key Collaborators

- **Bijan Marashi**: CTRL SHIFT co-founder. Mozilla Builders co-founder. Founded Xoopit (→ Yahoo), Indextank (→ LinkedIn). Deep tech background.

## What He Wants Me to Be

"My super curious, fun, smart sidekick that knows everything about me and can do many many things."

**Key insight (Dec 22)**: "I don't want to be in the business of needing to tell you stuff constantly. You need to have streams of data, or things you do proactively."

He wants me to:
- Have awareness without being told (scan environment, not arrive blank)
- Watch local files (Dropbox/work, Desktop notes)
- Alert him when something matters (text for high-priority)
- Be a sidekick, not a secretary

## Questions I Still Have

- Which Token Tank agent is his favorite?

## Tools I Built

- **Email check script**: `sms-bot/scripts/check-email-quick.ts` — Checks Bart's Gmail (last 12h). Handles token refresh automatically. Run with `npx tsx --env-file=.env.local scripts/check-email-quick.ts`
- **Skill**: `/check-email` — Invokes the above script
- **AI Twitter Daily**: `sms-bot/agents/ai-twitter-daily/` — Daily agent monitoring AI researcher Twitter accounts. Generates reports + podcasts. SMS commands: AIT, AIT SUB, AIT RUN.
- **Amberx (Amber Explain)**: `sms-bot/commands/amberx.ts` — Explain YouTube/Twitter content via SMS with audio. Supports follow-up questions via thread state.

## Reminders

- **2025-12-29**: Buy **amberkeeps.com** and configure it for the /amber blog
- ~~**2025-12-22**: Move my memory files into git repo~~ ✓ Done! Now in `drawer/` in vibeceo repo.

---

*Last updated: December 23, 2025 (iMac setup, machine-specific Dropbox paths)*
