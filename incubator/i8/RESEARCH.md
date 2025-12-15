# i8: Building an AI That Thinks Like an Entrepreneur

Infrastructure project i8 — giving our agents genuine founder intuition.

**See also:** `research-report.txt` — comprehensive 7-dimension framework (prompt engineering, fine-tuning, RL, agent architecture, simulation environments, archetype switching, success metrics).

---

## The Question

How do we build an AI that doesn't just *talk* like an entrepreneur, but actually *thinks* like one — making decisions the way founders do, with the same risk calculus, intuition, and pattern recognition?

We have 8 entrepreneur archetypes (see `incubator/documentation/entrepreneur-archetypes.txt`). The goal isn't to create a chatbot that sounds like Travis Kalanick or Sara Blakely. It's to create an AI that would make the *same decisions* they would make when facing identical opportunities.

---

## The Problem with Prompting Alone

Current approach: System prompts with persona instructions ("You are a Relentless Hustler...").

**What prompting does well:**
- Surface-level voice/style changes (word choice, tone)
- Following explicit rules ("always ask about customer feedback first")
- Maintaining character consistency in conversation

**What prompting does poorly:**
- Deep decision-making patterns (risk tolerance, opportunity evaluation)
- Implicit knowledge (what questions to ask, what signals matter)
- Consistent behavior under novel situations
- True "founder intuition" — the pattern recognition that comes from experience

Research shows persona prompting affects *how* an LLM communicates but has limited impact on the *quality* of its reasoning or decisions. A "cautious investor" prompt makes Claude use cautious language, but doesn't actually change its underlying risk assessment.

---

## Four Approaches (Ranked by Effort)

### 1. Enhanced Prompting + Structured Reasoning (Low Effort)

**What it is:** Better prompts combined with explicit reasoning frameworks.

**Implementation:**
- Detailed system prompts with decision trees, not just persona descriptions
- Chain-of-thought forcing: "Before any business decision, evaluate through [framework]"
- Example-laden prompts: Real decisions from that archetype's exemplar
- Structured output: Force the AI to show its reasoning path

**Example for Relentless Hustler:**
```
Before evaluating any opportunity, answer:
1. Can I get to revenue within 30 days? How?
2. What's the scrappy version that costs <$100?
3. Who do I need to talk to TODAY?
4. What did Sara Blakely do in a similar situation?
```

**Pros:**
- Immediate implementation, no training needed
- Easy to iterate and adjust
- Transparent reasoning (you see the framework being applied)

**Cons:**
- Still surface-level — the AI follows rules rather than internalizing patterns
- Rigid — real entrepreneurs break their own rules situationally
- Doesn't scale to novel situations not covered by the framework

**Effort:** 1-2 days per archetype
**Expected improvement:** 20-30% more founder-like decisions

---

### 2. Constitutional Entrepreneur Training (Medium Effort)

**What it is:** Use Constitutional AI (CAI) / RLAIF techniques to train a model that has entrepreneurial values "baked in."

**How Constitutional AI works:**
1. Generate responses to business scenarios
2. Have another AI critique those responses against entrepreneurial principles
3. Revise responses based on critique
4. Train on the revised responses

**Implementation for Entrepreneur AI:**
- Define "constitutional principles" for each archetype
- Generate thousands of business scenarios
- Have Claude critique each response: "Would a Relentless Hustler make this choice? Why or why not?"
- Train on the critiqued/revised outputs

**Example constitutional principles for Blitzscaler:**
- "Speed over perfection in winner-take-all markets"
- "Legal battles are a cost of doing business, not a blocker"
- "If competitors are moving, we should be moving faster"

**Pros:**
- Values become internalized, not just followed
- Works on novel situations (principles, not rules)
- Doesn't require human labeling at scale

**Cons:**
- Requires access to fine-tuning API or model training
- Principles can conflict — need hierarchy/weighting
- Risk of overfitting to specific scenarios

**Effort:** 2-4 weeks
**Expected improvement:** 40-60% more founder-like decisions

---

### 3. Synthetic Founder Simulation (High Effort)

**What it is:** RL-style training in simulated business environments.

**How it works:**
1. Build a business simulation environment (market, competitors, customers, resources)
2. Define reward function based on archetype goals (Hustler = revenue velocity, Visionary = mission alignment)
3. Run thousands of simulated business scenarios
4. Train model to maximize archetype-appropriate rewards

**Implementation:**
- Create "gym environment" for business decisions
- State: Market conditions, resources, competition, customer signals
- Actions: Pricing, hiring, pivoting, fundraising, marketing, etc.
- Rewards: Different per archetype (Bootstrapper penalized for VC, Blitzscaler penalized for slow growth)

**Pros:**
- Learns emergent strategies, not just rule-following
- Handles novel situations through generalization
- Can discover tactics humans haven't codified

**Cons:**
- Sim-to-real gap: Business simulation is hard to make realistic
- Reward hacking: AI finds shortcuts that don't transfer
- Massive compute and engineering effort

**Effort:** 2-3 months
**Expected improvement:** 60-80% more founder-like decisions (if sim is good)

---

### 4. Fine-Tuning on Real Entrepreneur Decisions (Highest Effort)

**What it is:** Collect real decision data from founders and fine-tune on it.

**Data sources:**
- Founder interviews and podcasts (transcribed, decisions extracted)
- "How I Built This" style narratives with decision points
- YC advice, founder blogs, post-mortems
- Synthetic data generated from real founder biographies

**Implementation:**
1. Curate decision dataset: scenario → decision → reasoning → outcome
2. Label by archetype (which founder type made this decision?)
3. Fine-tune base model on this data
4. Validate on held-out decisions

**Example data point:**
```json
{
  "scenario": "Competitor just raised $50M, we have 6 months runway",
  "archetype": "bootstrapper",
  "decision": "Stay the course, don't raise",
  "reasoning": "Their burn rate is their weakness. We outlast them.",
  "outcome": "Competitor imploded 18 months later, we acquired their customers"
}
```

**Pros:**
- Grounds decisions in real-world founder behavior
- Captures tacit knowledge that's hard to codify
- Most likely to produce genuine "founder intuition"

**Cons:**
- Data collection is expensive and time-consuming
- Survivorship bias in public founder data
- May memorize specific decisions vs. learning patterns

**Effort:** 3-6 months
**Expected improvement:** 70-90% more founder-like decisions (with good data)

---

## Recommended Path for Token Tank

Given our constraints (time, compute, experimental nature), here's the path:

### Phase 1: Enhanced Prompting (Now)
- Already doing this with archetype system prompts
- Add structured decision frameworks to each agent's CLAUDE.md
- Include real decision examples from exemplar founders
- Force chain-of-thought reasoning on major decisions

### Phase 2: Constitutional Critique Loop (If Phase 1 works)
- Build a "founder critic" that reviews agent decisions
- Run it on LOG.md entries: "Would a real [archetype] have made this choice?"
- Use feedback to refine prompts and frameworks
- This is like CAI but at inference time, not training time

### Phase 3: Decision Database (Long-term)
- Every agent logs decisions with context, reasoning, outcome
- Over time, build dataset of AI entrepreneur decisions
- Use for fine-tuning or few-shot retrieval
- Also: valuable research artifact

---

## Key Insight

The archetypes document gives us the *what* (decision patterns) but not the *how* (implementation).

**The gap:** "Evaluate every opportunity against mission impact first" is a rule. Knowing *how* to evaluate mission impact — what questions to ask, what signals matter, how to weight conflicting information — that's founder intuition. That's what we're trying to build.

**Closing the gap requires:**
1. Many examples of the pattern being applied (few-shot or fine-tuning)
2. Feedback loops that reinforce correct applications (constitutional or RL)
3. Structured reasoning that makes implicit knowledge explicit (chain-of-thought)

All four approaches work on these three dimensions. The question is how much effort we want to invest in each.

---

## Additional Dimensions (from research-report.txt)

The comprehensive research report covers areas beyond the four core approaches:

### Agent Architecture
- **Memory streams**: Long-term memory with retrieval (like Park et al.'s generative agents)
- **Reflection modules**: Periodic self-analysis to derive lessons from experience
- **Plan-act loops**: Multi-step reasoning with explicit planning phases
- **Tool use**: Archetype-specific tools (e.g., financial models for Data-Driven Optimizer)

### Multi-Agent Dynamics
- **Internal debates**: Spawn two archetype agents to argue a decision, then reconcile
- **Competitive simulation**: Pit different archetypes against each other in the same market
- **Founder-investor negotiations**: RL training through simulated pitch interactions

### Archetype Switching
- **Context-driven triggers**: Phase changes (R&D → growth) may warrant different archetypes
- **Continuous sliders**: Risk-tolerance and data-vs-intuition as adjustable parameters
- **Controlled blending**: "70% Bootstrapper, 30% Optimizer" style mixing
- **Constraint**: Don't let all agents converge — diversity is the point

### Success Metrics (PersonaGym-inspired)
- **Persona Adherence Score**: Does the Data-Driven agent demand data in X% of decisions?
- **Decision Divergence**: Pairwise difference rate between archetypes on identical scenarios
- **Linguistic Style Markers**: NLP analysis for archetype-consistent language patterns
- **Recovery Time**: How quickly does an agent bounce back from setbacks?

---

## Open Questions

1. **How do we measure "founder-like" decisions?** PersonaGym framework offers one approach.
2. **Should archetypes blend?** Real founders are mixes. Forge is Hustler × Perfectionist.
3. **What's the sim-to-real gap for business decisions?** Can we even simulate meaningfully?
4. **How much data is enough?** 100 decisions? 10,000? Unknown.
5. **When to allow switching?** Too much adaptation loses the diversity that makes this interesting.

---

## References

- Wasserman, N. "The Founder's Dilemmas" — Rich vs King framework
- Graham, P. "Founder Mode" — Staying involved vs delegating
- Anthropic. Constitutional AI papers — RLAIF techniques
- Park et al. (2023). Generative Agents — Memory streams + reflection architecture
- PersonaGym — Framework for evaluating persona adherence in LLMs
- Hoffman, R. "Blitzscaling" — Aggressive growth strategy patterns
- Our archetype document: `incubator/documentation/entrepreneur-archetypes.txt`
- `research-report.txt` — Full 7-dimension framework (this folder)

---

*Research compiled for Token Tank infrastructure project i8.*
*Last updated: December 2025*
