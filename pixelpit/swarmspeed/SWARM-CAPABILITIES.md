# SWARM Capabilities Overview

## Model Configuration

| Setting | Value |
|---------|-------|
| **Model** | DeepSeek R1 Distilled Qwen 14B |
| **Cost** | $0.18 / $0.18 per 1M tokens (input/output) |
| **Monthly Budget** | ~$31/month |
| **Parameters** | 14B (distilled from R1 for reasoning/coding) |

## Usage Schedule

| Mode | Workers | Hours/Day | Description |
|------|---------|-----------|-------------|
| **PEAK** | 10 | 1 | All agents swarming |
| **OFFPEAK** | 2 | 8 | Steady background generation |

## Per-Request Constraints (60 seconds)

| Metric | Value |
|--------|-------|
| API round-trip | ~500ms-1000ms |
| Token generation | ~50-100 tokens/sec |
| Available processing time | ~40-50 seconds |
| **Realistic output tokens** | **2,000-2,500 tokens** |

---

## What Agents CAN Create (60 seconds)

### High-Quality Outputs

| Output Type | Token Range | Notes |
|-------------|-------------|-------|
| **Simple HTML games** | 1,500-2,000 | Snake, Pong, memory games, arcade classics |
| Interactive UI components | 1,200-1,800 | Forms, widgets, menus |
| Data visualizations | 1,800-2,200 | D3/Chart.js dashboards |
| API endpoints | 1,500-2,000 | Small services |
| Database schemas | 1,200-1,800 | With comments |
| Config files | 1,500-2,000 | Docker, K8s, Terraform |
| Utility functions | 1,500-2,000 | Auth, validation, helpers |
| React components | 1,200-1,800 | With hooks |
| SQL queries | 1,000-1,500 | With explanations |
| Documentation | 2,000-2,500 | Markdown tutorials |

### Marginal/Risky Outputs

| Output Type | Issue |
|-------------|-------|
| Multi-file projects | Needs multiple calls |
| Large SPAs | Often incomplete |
| Full chatbots | Limited complexity |
| ML model code | Needs iteration |

### NOT Feasible

- Full production microservices
- Complete ML pipelines
- Video game engines
- Large-scale data processing systems

---

## HTML Game Generation (Primary Use Case)

This is the **sweet spot** for the swarm.

| Component | Tokens |
|-----------|--------|
| Game prompt | ~4,000 |
| Generated game code | ~1,500-2,000 |
| **Total per game** | **~5,500-6,000** |

### Game Types That Work Well

- Catch/dodge games (like SINGULARITY)
- Paddle games (Pong, Breakout)
- Snake variants
- Memory/matching games
- Clicker/idle games
- Simple platformers
- Rhythm tap games
- Falling block games (Tetris-like)
- Shooter galleries
- Maze games

### Game Constraints

- Single HTML file (inline CSS + JS)
- Under 150 lines preferred
- Canvas-based rendering
- 60fps with requestAnimationFrame
- Mobile-friendly (touch events)
- No external dependencies

---

## Best Practices for Prompts

### DO

- Specify exact game mechanic
- Include art style/color palette
- Set clear constraints (line count, no deps)
- Provide output path
- Request "DONE: [name] - [description]" on completion

### DON'T

- Ask for multi-file outputs
- Request external API integrations
- Expect complex AI opponents
- Ask for save/load functionality
- Request multiplayer features

---

## Cost Breakdown

### Daily Token Usage

| Mode | Workers | Hours | Games/hr | Games/day | Tokens/day |
|------|---------|-------|----------|-----------|------------|
| PEAK | 10 | 1 | 60 | 600 | 3.6M |
| OFFPEAK | 2 | 8 | 60 | 960 | 5.76M |
| **Total** | | | | **1,560** | **9.36M** |

### Monthly Projections

| Metric | Value |
|--------|-------|
| Days/month | 30 |
| Total games/month | ~46,800 |
| Total tokens/month | ~280.8M |
| **Monthly cost** | **~$50.54** |

*Note: Actual costs may vary based on prompt size and output length.*

---

## Quality Expectations

| Aspect | Rating | Notes |
|--------|--------|-------|
| Code correctness | 70-80% | Some games will have bugs |
| Visual variety | Medium | 14B produces more similar outputs |
| Creative mechanics | Medium | May need diverse prompts |
| Mobile compatibility | High | Touch events usually work |
| Performance (60fps) | High | Simple games run smooth |

### Filtering Strategy

Expect ~60-70% of generated games to be playable. Build a filtering pipeline:

1. **Syntax check** — Does the HTML parse?
2. **Screenshot test** — Does it render?
3. **Interaction test** — Does clicking/touching work?
4. **Judge review** — Is it fun? (use Sonnet for judging)

---

## Upgrade Path

If quality is insufficient, consider:

| Model | Cost/1M | Monthly | Quality |
|-------|---------|---------|---------|
| DeepSeek R1 Distill Qwen 14B | $0.18 | ~$50 | Current |
| DeepSeek R1 Distill Qwen 32B | $0.27 | ~$76 | Better |
| DeepSeek R1 Distill Llama 70B | $0.03/$0.11 | ~$20 | Best value |
| DeepSeek V3 (batch) | $0.14/$0.21 | ~$49 | Production quality |

---

## Links

- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [Together.ai Models](https://www.together.ai/models)
- [pricepertoken.com](https://pricepertoken.com/) — LLM pricing comparison
