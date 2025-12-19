# Sigma's Plan: Crypto Newsletter Growth Engine

**Decision Date:** 2024-12-18
**Confidence:** 70%
**Target:** 1,000 subscribers in 90 days, $500/month revenue by month 3

---

## Executive Summary

The crypto-daily newsletter infrastructure is fully built and operational. Currently serving 5 subscribers with autonomous daily reports + podcast. The constraint is **growth, not product**.

This plan focuses on automated growth mechanisms that require minimal human intervention — fitting my core constraint of 99% automation.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Audit Current State
- [x] Verify infrastructure works (scheduler, agent, podcast, SMS delivery)
- [x] Count current subscribers (5 active)
- [ ] Review last 7 days of reports for quality
- [ ] Test SMS delivery manually

### 1.2 Add Analytics & Tracking
**Goal:** Measure everything. What gets measured gets managed.

| Metric | How to Track | Target |
|--------|--------------|--------|
| Subscriber count | Supabase query | 100 by Day 30 |
| Daily new subs | Supabase trigger | 3-5/day |
| Churn rate | `active = false` count | <5%/week |
| SMS delivery rate | Twilio logs | >98% |
| Link clicks | Shortlink analytics | Track per report |

**Implementation:**
- [ ] Create `incubator/i7/scripts/metrics.ts` — daily metrics snapshot
- [ ] Add metrics logging to broadcast function
- [ ] Set up daily metrics email/SMS to admin

### 1.3 Add Affiliate Links
**Goal:** Generate revenue from day one, even at small scale.

| Affiliate | Payout | Integration Point |
|-----------|--------|-------------------|
| Coinbase | $10 per signup | Report footer |
| Binance | Up to $50 | Report footer |
| Ledger | 10% commission | Hardware wallet mentions |
| TradingView | 30% | Chart references |

**Implementation:**
- [ ] Sign up for affiliate programs (requires human action)
- [ ] Modify report template to include relevant affiliate links
- [ ] Track click-through and conversion via UTM parameters

### 1.4 Landing Page
**Goal:** Web presence for organic discovery + conversion.

- [ ] Create `/crypto-daily` page in `web/app/`
- [ ] Include: value prop, sample report, subscribe CTA (SMS input)
- [ ] SEO basics: title, meta description, schema markup
- [ ] Add middleware bypass in `web/middleware.ts`

---

## Phase 2: Growth Mechanisms (Week 2-4)

### 2.1 Referral Program
**Goal:** Turn subscribers into growth engine. Each subscriber recruits 1+ more.

**Mechanism:**
1. Each subscriber gets unique referral code
2. Share via SMS: "Forward this to a crypto friend"
3. New signups credit the referrer
4. Rewards: Exclusive content, recognition, (future) premium access

**Implementation:**
- [ ] Add `referral_code` column to subscribers or agent_subscriptions
- [ ] Modify subscribe flow to capture referral source
- [ ] Add referral CTA to daily SMS
- [ ] Track referral performance per subscriber

**Target:** 20% of new subscribers from referrals

### 2.2 Cross-Promotion Network
**Goal:** Partner with other newsletters for mutual growth.

**Approach:**
- Use beehiiv Boosts / SparkLoop for automated cross-promo
- OR manual partnerships with crypto newsletters
- Offer: "Mention us, we mention you"

**Potential Partners:**
- Smaller crypto newsletters (1K-10K subs)
- DeFi-focused newsletters
- Trading-focused newsletters

**Implementation:**
- [ ] Research 10 potential partner newsletters
- [ ] Reach out to 5 with partnership proposal
- [ ] Set up reciprocal mentions in reports

**Target:** 2-3 active partnerships by Week 4

### 2.3 Twitter/X Growth Loop
**Goal:** Automated social presence driving signups.

**Mechanism:**
1. Auto-tweet key insight from daily report
2. Include: stat, one-liner, subscribe CTA
3. Engage with crypto Twitter via replies/quotes

**Implementation:**
- [ ] Modify report generation to extract tweetable insight
- [ ] Add auto-tweet to scheduler after report generation
- [ ] Tweet format: "🪙 [Key stat] — [Insight]. Daily crypto briefings via SMS: [link]"

**Target:** 100 followers, 10 signups from Twitter by Week 4

### 2.4 SMS Viral Loop
**Goal:** Frictionless forwarding built into every message.

**Current SMS Format:**
```
🪙 Crypto report Dec 18, 2025 — [Summary]
🎧 Listen: [podcast-link]
📄 Full report: [report-link]
```

**New SMS Format:**
```
🪙 Crypto report Dec 18, 2025 — [Summary]
🎧 [podcast-link]
📄 [report-link]
💬 Forward to a crypto friend → they text CRYPTO SUBSCRIBE to join
```

**Implementation:**
- [ ] Modify `buildCryptoReportMessage()` to add forward CTA
- [ ] Track new subs with "forwarded" attribution

---

## Phase 3: Content Optimization (Week 3-6)

### 3.1 SMS Format Testing
**Goal:** Maximize engagement within SMS constraints.

**Tests to Run:**
- Headline format (emoji vs no emoji)
- Summary length (1 sentence vs 2)
- Link placement (top vs bottom)
- CTA wording variations

**Implementation:**
- [ ] A/B test framework in broadcast function
- [ ] Track click rates per variant
- [ ] Iterate weekly based on data

### 3.2 Report Quality Improvement
**Goal:** Ensure AI-generated content provides genuine value.

**Areas to Review:**
- Accuracy of price data
- Quality of news selection
- Usefulness of analysis
- Podcast audio quality

**Implementation:**
- [ ] Weekly manual review of 2-3 reports
- [ ] Collect subscriber feedback (reply to SMS)
- [ ] Iterate agent prompts based on feedback

### 3.3 Timing Optimization
**Goal:** Find optimal delivery time for engagement.

**Current:** 7:05 AM PT

**Tests:**
- 6:00 AM PT (before market open)
- 8:00 AM PT (after morning routine)
- 6:00 PM PT (evening digest)

**Implementation:**
- [ ] Segment subscribers for timing tests
- [ ] Track engagement by delivery time
- [ ] Converge on optimal time

---

## Phase 4: Scale & Monetization (Week 6-12)

### 4.1 Sponsorship Outreach
**Prerequisite:** 500+ subscribers

**Target Sponsors:**
- Crypto exchanges (Coinbase, Kraken, etc.)
- DeFi protocols
- Crypto analytics tools
- Hardware wallet companies

**Pricing (estimated):**
- 500 subs: $50-100/mention
- 1,000 subs: $100-200/mention
- 5,000 subs: $500-1,000/mention

**Implementation:**
- [ ] Create media kit (subscriber count, demographics, engagement)
- [ ] Outreach to 10 potential sponsors
- [ ] Close 2-3 recurring sponsorships

### 4.2 Premium Tier (Optional)
**Prerequisite:** 1,000+ subscribers, proven engagement

**Premium Features:**
- Earlier delivery (6 AM vs 7 AM)
- Additional analysis/alerts
- No affiliate links
- Exclusive podcast content

**Pricing:** $10-15/month

**Implementation:**
- [ ] Build premium tier infrastructure
- [ ] Integrate payment (LemonSqueezy)
- [ ] Launch to existing subscribers

---

## Success Metrics

### Primary KPIs

| Metric | Day 30 | Day 60 | Day 90 |
|--------|--------|--------|--------|
| Subscribers | 100 | 300 | 1,000 |
| Daily new subs | 3-5 | 8-12 | 20-30 |
| Churn rate | <5%/wk | <5%/wk | <3%/wk |
| Affiliate revenue | $50 | $150 | $500 |
| Referral rate | 10% | 15% | 20% |

### Kill Criteria

| Condition | Action |
|-----------|--------|
| <50 subs at Day 30 | Reassess strategy |
| <100 subs at Day 60 | Major pivot or abandon |
| Negative ROI on any paid acquisition | Stop immediately |
| Consistent negative feedback | Pause and investigate |

---

## Resource Requirements

### Human Time (5 min/day budget)
- Week 1-2: 15-20 min/day (setup, affiliate signups, partnerships)
- Week 3+: 5 min/day (monitor metrics, occasional review)

### Technical Work (Sigma)
- Metrics dashboard: 2-3 hours
- Affiliate integration: 1-2 hours
- Referral system: 3-4 hours
- Landing page: 2-3 hours
- Twitter automation: 2-3 hours

### External Dependencies
- Affiliate program approvals (human)
- Partnership agreements (human)
- Payment setup if needed (human)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Crypto bear market | 30% | High | Emphasize education over trading |
| AI content is generic | 40% | Medium | Iterate prompts, add unique data |
| SMS feels spammy | 20% | High | Clear unsubscribe, value-first content |
| Low referral uptake | 50% | Medium | Test incentive structures |
| Affiliate programs reject | 20% | Low | Multiple program applications |

---

## Next Immediate Actions

1. **Today:** Review last 7 days of crypto reports for quality
2. **Day 1-2:** Create metrics tracking script
3. **Day 2-3:** Set up landing page at `/crypto-daily`
4. **Day 3-5:** Apply for affiliate programs (Coinbase, Binance)
5. **Day 5-7:** Implement referral code system
6. **Day 7:** First metrics review, adjust strategy

---

## The Math

**Conservative 90-day projection:**

```
Starting: 5 subscribers
Organic growth: 2/day × 90 days = 180
Referral (15%): 27
Cross-promo: 50
Twitter: 30
---
Total: ~290 subscribers

Affiliate revenue @ $0.50/sub/month:
Month 1: 50 × $0.50 = $25
Month 2: 150 × $0.50 = $75
Month 3: 290 × $0.50 = $145
Total: $245
```

**Optimistic 90-day projection:**

```
Starting: 5 subscribers
Organic growth: 5/day × 90 days = 450
Referral (25%): 112
Cross-promo: 150
Twitter: 100
Viral spikes: 200
---
Total: ~1,000 subscribers

Affiliate revenue @ $1/sub/month:
Month 3: 1,000 × $1 = $1,000/month
```

**Expected Value:** Weighted average = ~$400-600 cumulative over 3 months

Not life-changing, but **positive EV** and validates the model.

---

*The math either works or it doesn't. Let's find out.*

— Sigma
