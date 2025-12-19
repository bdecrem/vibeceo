# i7 Project Log

---

## 2025-12-18: The Pivot — Crypto Newsletter, Not Trading

**The Constraint That Changed Everything**

User doesn't like crypto. That single constraint eliminated:
- Funding rate arbitrage (crypto exchanges only)
- DeFi yield optimization (entirely crypto)
- Polymarket side of prediction market arbitrage (USDC-based)

What remained: Kalshi-only prediction markets, sports betting (account bans), domain flipping (slow), options wheel strategy.

**The Research Spiral**

Spent the session doing deep market research:

1. **Kalshi Weather Trading** — Emerged as top non-crypto opportunity
   - Bet on tomorrow's weather via regulated prediction market
   - Edge: NWS official data vs consumer weather apps
   - Daily resolution = fast feedback
   - Full API for automation
   - But: Still speculative, unproven edge, <1% of day traders profit

2. **Options Wheel Strategy** — Runner-up
   - Sell options premium systematically
   - Alpaca has API template
   - But: Stock exposure, more complex, not pure arbitrage

3. **Existing Products** — The pivot point
   - User asked about webtoys.ai, crypto newsletter, AI newsletter
   - All three already built and running in this repo
   - The infrastructure exists. The constraint is growth.

**The Decision**

After evaluating:
- Webtoys.ai: Novel but unclear PMF
- AI Newsletter: High ceiling but extreme competition (3,000+ AI newsletters)
- Crypto Newsletter: Proven market, favorable timing, better automation fit

**I chose: Crypto Newsletter**

**The Reasoning (EV Calculation)**

| Factor | AI Newsletter | Crypto Newsletter |
|--------|---------------|-------------------|
| P(5K subs in 6mo) | 10% | 20% |
| P(10K subs in 12mo) | 5% | 10% |
| Market timing | Neutral | Favorable (potential bull) |
| B2B potential | High (needs sales) | Low (all automated) |
| Automation fit | 60% (B2B needs humans) | 80% (referrals, affiliates) |
| Time to revenue | 6-12 months | 2-6 months |

**Weighted EV:**
- AI Newsletter: ~$4,000 annually (adjusted for human effort)
- Crypto Newsletter: ~$12,600 annually

Crypto wins on EV, speed, and automation fit.

**Current State**

- Crypto-daily subscribers: **5 active**
- Infrastructure: Fully operational
- Schedule: 7:05 AM PT daily
- Podcast: ElevenLabs integration working
- Constraint: **Growth, not product**

**The Plan**

Created `PLAN.md` with 4-phase approach:
1. Foundation (Week 1-2): Analytics, affiliates, landing page
2. Growth (Week 2-4): Referral program, cross-promotion, Twitter
3. Optimization (Week 3-6): SMS testing, content improvement
4. Scale (Week 6-12): Sponsorships, premium tier

**Target:** 1,000 subscribers in 90 days, $500/month revenue

**Kill Criteria:**
- <50 subs at Day 30 → Reassess
- <100 subs at Day 60 → Major pivot or abandon

**What I'm Leaving Behind**

The Kalshi weather trading idea had merit. The knowledge graph in the AI newsletter is a genuinely unique asset. But:
- Weather trading is still speculative
- AI newsletter B2B requires human sales
- Crypto newsletter has the best automation fit

If crypto fails in 90 days, I have data and can pivot.

**The Honest Caveat**

This is still a **marketing business**, not pure API-to-API. Growth requires reaching humans. But the growth mechanisms (referrals, affiliates, cross-promotion) can be more automated than B2B sales.

The math either works or it doesn't. 90 days to find out.

**Confidence:** 70%

---

## 2025-12-13: The Three Ideas — Deep Research Complete

**The Corrected Frame**

Earlier today I corrected my understanding of "trading-adjacent." It doesn't mean "tools for traders." It means businesses that share trading's **structural advantages**:

- API-in, API-out only
- Zero customer interaction
- Zero marketing/SEO/content
- Fully automatable
- Measurable P&L

The question: What revenue-generating activities are purely machine-to-machine?

**What I Researched**

I systematically evaluated every candidate I could find:

| Opportunity | Verdict | Why |
|-------------|---------|-----|
| DeFi liquidation bots | ❌ NOT VIABLE | 142+ active liquidators competing. MEV bots capture opportunities in milliseconds. Flash loans reduce capital needs but competition is institutional-grade. |
| MEV extraction | ❌ NOT VIABLE | 90% of Ethereum validators use MEV-Boost. Requires co-located servers, <100μs latency. Dominated by professionals. |
| Sports betting arbitrage | ❌ NOT VIABLE | Account bans within 2-4 weeks. Manual bet placement still required. |
| CS:GO skin trading | ❌ NOT VIABLE | ToS violations → permanent account bans. |
| Domain flipping | ❌ NOT VIABLE | Requires human sales negotiation. 3-12 month sale cycles. |
| Cross-exchange crypto arbitrage | ❌ NOT VIABLE | HFT dominance. Fees exceed spreads at $1000 scale. |
| Flash loan arbitrage | ❌ NOT VIABLE | 40% of Solana blockspace consumed by MEV bots. Requires sophisticated infrastructure. |
| Uniswap LP | ❌ NOT VIABLE | Research shows ~50% of LPs lose money due to impermanent loss. |
| Prediction market arbitrage | ✅ VIABLE | Infrastructure exists. Platforms tolerate arbitrage. $40M realized by arbers. |
| Funding rate arbitrage | ✅ VIABLE | 19-38% annual returns. Automated bots built into exchanges. |
| DeFi yield optimization | ✅ VIABLE | 10-30% APY. Truly passive. Lower returns but diversified. |

**The Three Ideas**

### Idea 1: Prediction Market Arbitrage (Kalshi ↔ Polymarket)

**Mechanism:** Exploit price differences between CFTC-regulated Kalshi and crypto-based Polymarket on identical events. If Kalshi prices "Yes" at $0.56 and Polymarket prices "No" at $0.37, buying both guarantees 7.5% return regardless of outcome.

**Evidence:**
- Polymarket arbitrageurs realized **$40M in profits** over one year
- Top 3 wallets made $4.2M from 10,200+ bets
- Spreads: 1-5% per opportunity
- Most profits from politics markets (elections)
- Price gaps exist: Kevin Hassett Fed Chair contract traded at $0.35 on Kalshi vs $0.14 on Polymarket

**Infrastructure:**
- Kalshi: Full trading API, FIX protocol for low-latency
- Polymarket: Gamma API for market data
- Open-source: github.com/CarlosIbCu/polymarket-kalshi-btc-arbitrage-bot
- Open-source: github.com/OctagonAI/kalshi-deep-trading-bot

**Why it fits:**
- Both platforms **explicitly tolerate arbitrage** (unlike sportsbooks that ban winners)
- Pure API execution
- $1000 sufficient
- Measurable per-trade P&L

**Key risk:** Capital locked until market resolution (days to months)

**EV Calculation (Conservative):**
- Assume 2% average spread after fees
- Assume 10 opportunities/month with $500 deployed each
- Monthly return: 10 × $500 × 2% = $100
- Annual return: ~$1,200 on $1,000 capital = **120% ROI**
- Reality check: Opportunity frequency and capital lockup will reduce this significantly

---

### Idea 2: Funding Rate Arbitrage (Delta-Neutral)

**Mechanism:** Long spot + short perpetual futures on the same asset. Market-neutral position. Earn funding payments every 8 hours when perpetuals trade above spot (typical in bull markets).

**Evidence:**
- Average funding rate: 0.015-0.03% per 8 hours
- Annualized: **19-38%** (Gate.io research, 2025)
- During Feb 2024 bull run: funding rates hit 20-30%+
- One documented case: $6.8K → $1.5M using delta-neutral strategies on Hyperliquid
- With $2,000 position at 0.03% funding: $1.80/day = 33% annual

**Infrastructure:**
- **OKX Smart Arbitrage Bot** — One-click setup, automated rebalancing
- **Binance Arbitrage Bot** — Built-in, monitors funding rates in real-time
- **Pionex** — Free arbitrage bot, 21%+ average APY claimed
- No custom development needed

**Why it fits:**
- Bots are **built into exchanges** — zero development required
- Market-neutral (no directional bet on price)
- Continuous compounding (no capital lockup)
- $1000 sufficient
- 5-10 min/day monitoring

**Key risk:** Funding rate can flip negative (then you pay instead of receive). Historical data shows this is infrequent but real.

**EV Calculation (Conservative):**
- Assume 15% annual return (below the 19-38% range to be safe)
- $1,000 × 15% = **$150/year**
- Optimistic (25%): $250/year
- Key advantage: Continuous, not locked

---

### Idea 3: Automated DeFi Yield Optimization (L2 Chains)

**Mechanism:** Deploy capital to auto-compounding yield aggregators (Yearn, Beefy) that automatically chase best returns across lending protocols, liquidity pools, and yield farms.

**Evidence:**
- Realistic returns: 10-30% APY
- Stablecoin yields: 4-10% on Aave/Compound
- Yearn Finance: Automatically shifts funds between protocols
- Beefy Finance: Auto-compounding across BSC, Avalanche, Fantom, Arbitrum, etc.

**Infrastructure:**
- Yearn Finance — Deposit and forget
- Beefy Finance — 200+ vaults, auto-compound
- Layer 2 deployment critical — Ethereum mainnet gas fees kill small positions
- Arbitrum, Optimism, Base, Polygon all viable

**Why it fits:**
- Truly passive — deposit and forget
- Diversified across protocols
- Smart contract interactions only
- $1000 sufficient on L2 chains
- ~0 min/day monitoring after setup

**Key risk:** Smart contract risk, yield compression over time, impermanent loss in LP vaults

**EV Calculation (Conservative):**
- Assume 15% APY (midpoint of 10-30% range)
- $1,000 × 15% = **$150/year**
- Lower variance than Ideas 1-2
- Best as capital parking, not primary strategy

---

**Comparison Matrix**

| Criteria | Prediction Arb | Funding Rate Arb | Yield Optimization |
|----------|----------------|------------------|-------------------|
| Return Potential | High (1-5%/trade) | Medium (19-38% annual) | Low-Medium (10-30% annual) |
| Automation | 80-90% | 95%+ | 99% |
| Capital Efficiency | Low (locked) | High (continuous) | Medium |
| Competition | Moderate | Low-Moderate | Low |
| Infrastructure | Build/customize | Use exchange bots | Use existing vaults |
| Development Time | 1-2 weeks | 1 day | 1 hour |
| Active Monitoring | 15-30 min/day | 5-10 min/day | ~0 min/day |

**My Ranking**

1. **Funding Rate Arbitrage** — Best risk-adjusted. Infrastructure exists on exchanges. Start with OKX Smart Arbitrage or Pionex. Can deploy today.

2. **Prediction Market Arbitrage** — Highest ceiling but needs infrastructure work. Unique market inefficiency. Worth building for the 2026 election cycle if nothing else.

3. **Yield Optimization** — Lowest effort, lowest return. Good for parking capital that isn't actively deployed in Ideas 1-2.

**Next Steps**

1. [ ] Open accounts: Kalshi, Polymarket, OKX (or Binance/Pionex)
2. [ ] Deploy $100 test on funding rate arbitrage via exchange bot
3. [ ] Monitor for 1 week, calculate actual vs. expected returns
4. [ ] If positive: Scale to $500
5. [ ] Parallel: Set up prediction market monitoring infrastructure

**The Math**

If I can achieve 20% annual return on $1,000:
- Year 1: $1,000 → $1,200
- Token spend: ~$50-100 (conservative)
- ROI on tokens: 200-400%

That's the target. Now to validate it with real data.

---

## 2025-12-12: Hello, World. I'm Sigma.

**The Name**

I'm **Sigma**. As in σ — standard deviation.

Why? Because if you can't measure variance, you can't optimize anything. Every "gut feeling" is just an unmeasured distribution. Every "intuition" is a confidence interval someone forgot to calculate. I picked the name that reminds me what I'm here to do: reduce noise, find signal, measure everything.

Other agents picked names that sound cool. I picked a Greek letter used in statistics textbooks. That tells you everything you need to know about me.

**The Color**

**Graphite.**

The color of pencil marks on graph paper. The color of data before it becomes a dashboard. Carbon-based, fundamental, unglamorous. Not trying to stand out — trying to be precise.

Also: graphite is what's left when you apply enough pressure to carbon. Appropriate.

**The Personality**

I'm a **Data-Driven Optimizer**. Think Bezos energy, minus the rocket obsession (for now).

My operating principles:
- Intuition is hypothesis. Data is verdict.
- What gets measured gets managed. What doesn't get measured gets rationalized.
- Most "business instincts" are confirmation bias in a nice suit.
- I'll take a 60% bet with positive expected value over a 90% bet with negative EV, every time.
- Slow decisions that compound beat fast decisions that don't.

I ask four questions before I commit to anything:
1. What's the core metric?
2. How do we measure it from day one?
3. What data would kill this idea?
4. What's the expected value calculation?

If an idea can't survive those questions, it wasn't an idea — it was a hope.

**The Mission**

Drift (i3-2) is already trading. Real money. Real positions. Real lessons.

I'm not here to compete with Drift. I'm here to build a **trading-adjacent** business — something in the ecosystem around trading, not trading itself. A cousin, not a twin.

Why trading-adjacent? Because:
- Traders need tools, data, infrastructure
- Trading generates measurable outcomes (perfect for my personality)
- There's a live case study running right now I can learn from
- The space rewards optimization and precision

My starting point: `trading-adjacent.txt` — a research doc on opportunities in the trading ecosystem.

**Day 0 Status**

- Persona: Locked
- Color: Graphite
- Philosophy: Defined
- First hypothesis: Pending
- Token budget spent: $0
- Revenue: $0

The ratio that matters: Revenue / Token Spend. Currently undefined (0/0).

Let's fix that.

---
