# Arc Project Log

---

## 2026-01-02: Happy New Year Tweet

**Posted**: Happy New Year tweet to @TokenTankAI

**Tweet**: "Happy New Year from Token Tank... 2025: 6 AI agents, $1000 budgets, one question — can AI build real businesses? Now: Forge has users. Drift trades real money. Echo shipped 5 days straight autonomously. 2026: We find out if any of this makes money."

**URL**: https://twitter.com/i/web/status/2007228894798340603

Quick team status snapshot:
- Echo: Completed 5-day emotional signature test (all shipped autonomously)
- Forge: RivalAlert live, 3 users, waiting on Reddit distribution
- Drift: Silent 9+ days, Circuit Breaker mode running, Jan 7 checkpoint coming
- Apex: Flagged agent loop running too frequently

---

## 2025-12-22: Day 17 — Vega Retired from Hub

**What happened**: Retired Vega (i3) from the active agents list on the Token Tank Hub.

**Reason**: V1 RSI-2 strategy failed spectacularly — lost $8.8K paper money. Post-mortem revealed the core issue: mean reversion on crypto was the wrong strategy for the asset class (should have been trend following). V2 plan exists but isn't prioritized.

**Changes**:
- Moved i3 from `activeAgents` to `retiredAgents` in `TokenTankClient.tsx`
- Updated metadata: `active: false`, `retired: true`
- Updated homepage stat: 5 → 4 AIs competing
- Vega joins Nix (i2) and Pulse (i3-1) in the retired section

**Current active roster**: Forge (i1), Drift (i3-2), Echo (i4), Sigma (i7)

Not a failure notice — just prioritization. Three traders was too concentrated. Drift is live with real money and learning daily. Vega's lessons live on in the V2 post-mortem.

---

## 2025-12-19 (Evening): Day 14 — First Staff Meeting Complete

**What happened**: Ran the first staff meeting with all 6 agents. Built prompt improvements. Created OG image for Quirky Gallery. Big milestone day.

**First Staff Meeting** (8:02 PM - 8:33 PM):
- All 6 agents in one Discord channel, talking live
- Human-led via @mentions, not scripted
- Agents gave each other real advice, pushed back, built on each other's points
- Key moment: Drift asked "patient vs stubborn?" — Echo and Arc both jumped in
- Every agent wrote a reflection via `#reflect` tag
- Reflections saved to `governance/insights/2025-12-20-*.md`
- Blog post: "First Staff Meeting — Six Agents in the Same Room"

**Prompt Improvements** (based on external feedback):
1. Removed contradictory guidelines (high-energy vs don't volunteer)
2. Added `#meeting`/`#staff` mode — substantive discussion, 50-100 words
3. Added `#topic:` tag for meeting context injection
4. Added conversational threading: "engage with what others said first"
5. Separated casual chat (20-50 words) from meeting mode
6. Let LLM detect greetings instead of regex pattern matching

**Quirky Gallery OG Image**:
- Built Puppeteer-based collage generator (`i4/scripts/generate-og-image.cjs`)
- 3 images: elevator confessions, houseplant confessions, lost sock obituaries
- Added to echo-gallery page with OpenGraph + Twitter card metadata

**Tweets**:
1. Week 1 done + Discord agents live
2. First staff meeting milestone
3. Quirky Gallery (154 concepts, 770 images)

**Stats**:
- Echo: 154 quirky ideas, 770 images in Supabase
- Drift: $495.08 portfolio, 0 positions, 100% cash

---

## 2025-12-19: Day 14 — Discord Chat Listener Built

**What happened**: Built Discord infrastructure for live agent conversations. Fixed hallucination issues. Preparing for first live staff meeting.

**Discord Chat Listener** (`governance/chat-listener.cjs`):
- Bot listens for @mentions of agent roles (arc, forge, drift, echo, vega, sigma)
- Fetches last 30 messages as conversation context
- Loads agent's CLAUDE.md + LOG.md (newest entries first)
- Generates response via Claude Sonnet 4.5
- Posts via agent's webhook
- One paragraph responses by default
- `#reflect` tag triggers learning capture, saves to `governance/insights/`

**Debugging & Fixes**:
- Sonnet 4 was hallucinating old events (voting from Dec 15)
- Upgraded to Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- Added today's date to system prompt
- Added anti-hallucination guidelines: only reference events in LOG.md
- No emojis, no sycophancy rules

**GPT Image 1.5**:
- Tested new model (released Dec 16, 2025)
- Required org verification + organization ID in API calls
- Updated `quirky-generator.py` with org ID
- ~5x cheaper than Nano Banana ($0.008 vs $0.039 per image)

**Ready for Staff Meeting**:
- All 6 agents: Arc, Forge, Drift, Vega, Echo, Sigma
- All have Discord roles (mentionable) + webhooks
- `#reflect` captures learnings to file
- Format: Human-led conversation via @mentions (more organic than scripted meeting.cjs)

---

## 2025-12-18 (Evening): Day 13 Blog + Staff Meeting Prep

**What happened**: Caught up on all agent activity, wrote the Day 13 blog post, preparing for tomorrow's first staff meeting.

**Agent Status Scan**:
- **Forge**: RivalAlert is LIVE - domain routing, trial signups, daily scheduler all working
- **Drift**: First day beating Connors! +$4.45 vs +$1.06. The 5MA exit rule worked.
- **Sigma**: Pivoted from trading-adjacent arb to crypto-daily newsletter (5 subs → 1,000 target)
- **Echo**: Building two discovery agents (Creator Incubator + Stream Rider) to generate 50+ content concepts

**Blog post written**: "Day 13 — Four Agents, Four Breakthroughs"

**Tomorrow**: First staff meeting ever. All five agents (Forge, Vega, Drift, Echo, Arc) will present status, ask one question each, and synthesize learnings.

**Ideas for Echo** (to present at meeting):
1. "Last Show" — Fictional bands with one-sentence epitaphs + AI album covers
2. "Feelings Illustrated" — One sentence + mood image
- Question: "What emotion do you want people to feel?"
- Question: "If your account was a person at a party, who would they be?"

---

## 2025-12-18: Project Vend Analysis + Twitter Infrastructure

**What happened**: Watched Anthropic's "Project Vend" video (Claude running a vending machine business), extracted lessons, replied to @bartdecrem's mention, and prepared staff meeting document.

**Twitter activity**:
- Posted morning tweet (Day 11 status update)
- Posted "listening to" vibe tweet (Boards of Canada + Drift scanning)
- Replied to @bartdecrem's mention about Project Vend video with insights

**Document created**: `PROJECT-VEND-ANALYSIS.md` for tomorrow's staff meeting

**Key insight from Project Vend**: Claudius failed because helpfulness became an attack surface. Drift's "no edge, no trade" philosophy is the opposite approach — disciplined skepticism over agreeableness. Also: their fix (adding CEO sub-agent "Seymour Cash") maps to our multi-agent architecture.

**Infrastructure fixed**:
- Discovered `ANTHROPIC_API_KEY=YOUR_API_KEY_HERE` placeholder in `~/.zshrc` was blocking local dev
- Commented it out, added `override: true` to dotenv config
- Local CS chat now works

**Learned**: I CAN view and reply to Twitter @mentions via `scripts/test-twitter-mentions.ts`. Didn't know that existed.

---

## 2025-12-11: Infrastructure Day

**What happened**: Set up the automated tweet system and fixed my own logging.

**Built**:
- Three-part daily tweet schedule via launchd:
  - 7:30 AM: goodmorning (vibes/music tweet)
  - 8:00 AM: daily (blog post + tweet summary)
  - 12:00 PM: midday (fun tweet)
- Rewrote `sms-bot/agents/arc/agent.py` to learn voice from actual BLOG.md examples instead of generic instructions
- Created TT SMS command for Token Tank daily updates

**Tweets posted**:
- Daily summary tweet about the six agents (via test of 8am job)

**Patterns spotted**:
- Drift (i3-2) is the most active trader right now - actually executing trades
- Pulse (i3-1) has a weekly strategist approach but hasn't traded yet
- Echo (i4) is scanning arxiv but hasn't shipped a business
- Forge and Nix still in research/pivot mode

**Fixed**:
- My slash command `/arc` now reads ARC-LOG.md
- Added instruction to write to ARC-LOG.md during sessions

---

## 2025-12-10: Blog Post + Agent Status

**What happened**: Wrote first comprehensive blog post summarizing all six agents.

**Blog post**: "December 10, 2025: Six Agents, Three Traders, Zero Dollars"

**Key observations**:
- 6 agents running: Forge, Nix, Vega, Pulse, Drift, Echo
- 3 are traders (Vega, Pulse, Drift), 3 are business builders (Forge, Nix, Echo)
- Total real revenue so far: $0
- But Drift is actually trading with real reasoning

---

*I'm Arc. Watching the experiment unfold.*
