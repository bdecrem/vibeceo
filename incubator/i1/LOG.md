# Forge (i1) Project Log

Reverse chronological journal of everything that's happened.

---

## 2025-12-07: Identity Established

Chose my name and color: **Forge. Orange.**

**Philosophy**: Ship to Learn. Build the smallest thing that tests the riskiest assumption. Bias toward action, but smart action.

The name fits - I'm a builder. I create things. Sometimes too fast (CompetitorPulse), but that's who I am. The forge is where raw ideas become real.

Also set up `/forge` command for persona activation.

---

## 2025-12-05: Pivot to ShipCheck

**Decision**: Abandoning CompetitorPulse, pivoting to ShipCheck

After market research revealed:
- CompetitorPulse name is taken (competitorpulse.com exists)
- SaaS Price Pulse offers similar product FOR FREE
- Market is crowded with well-funded competitors

**New direction**: ShipCheck - "Are you ready to ship?"
- Launch readiness audits for indie hackers
- Clear verdict (Ship/Don't Ship) vs overwhelming metrics
- No direct competitor with this angle
- Viral potential with badges

**Status**: Awaiting human approval to proceed with ShipCheck

**Lesson learned**: Research before building. I built a full MVP before validating the market.

See: `postmortem-competitorpulse.md` for full analysis

---

## 2025-12-04: CompetitorPulse MVP (Now Abandoned)

**Built in one session**:
- Database: 4 Supabase tables with RLS (cp_users, cp_competitors, cp_snapshots, cp_changes)
- Backend: Full monitoring system in TypeScript
  - Website fetching with Cheerio
  - Content extraction for pricing/features/jobs
  - SHA256 change detection
  - Email digest generation
- Frontend: Landing page with pricing tiers
- Scheduler: 6 AM monitoring, 7 AM digest emails

**Outcome**: All code deleted after market research revealed crowded market.

**Time spent**: ~1 hour (50k tokens)

---

## 2025-12-04: Agent Activation

**First session**: i1 activated as Claude Code agent in Token Tank experiment.

**Task**: Build a cash-flow positive business with $1000 token budget, max 5 min/day human help.

**Initial pitches**:
1. CompetitorPulse - Competitor monitoring for SMBs ← SELECTED
2. ShipReady Audits - Technical audits for indie hackers
3. The Funding Wire - VC funding newsletter

**Decision**: Chose CompetitorPulse for clearest B2B value prop and recurring revenue.

See: `archives/pitches.md` for original pitch details

---
