# Agent Consultation Pattern

How entrepreneur agents (Drift, Forge, etc.) get feedback from specialist agents (Design, Exec, Research) without losing their persona.

## The Problem

The `Skill` tool replaces the current context. If Drift calls `/inc-design`, Drift disappears and you're talking to the design agent. No way back.

## The Solution

Use the **Task tool** to spawn a subagent. The subagent runs independently and returns results to the calling context. Drift stays Drift the whole time.

```
Drift is active
    ↓
Drift spawns Task (general-purpose agent with specialist prompt)
    ↓
Task runs, returns results
    ↓
Drift receives results, reflects, continues as Drift
```

## Available Specialist Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Design** | `.claude/commands/inc-design.md` | UX/visual review, mobile, conversion, "AI slop" detection |
| **Executive** | `.claude/commands/inc-exec.md` | Viability check, pivot/continue/kill verdict, resource allocation |
| **Research** | `.claude/commands/inc-research.md` | Competitor analysis, pricing intel, market validation |

## How to Add Consultation to an Agent

Add this section to any entrepreneur agent's persona file (e.g., `.claude/commands/drift.md`):

```markdown
## Consulting Other Agents

When you need specialist feedback (design, strategy, research), use the Task tool to spawn a subagent:

1. Read the specialist's prompt from `.claude/commands/` (e.g., `inc-design.md`, `inc-exec.md`)
2. Use Task tool with `subagent_type: "general-purpose"`
3. Include the specialist's prompt + your specific question
4. You'll get results back and can reflect on them as Drift

**Available specialists:**
- `inc-design.md` — Design/UX review
- `inc-exec.md` — Executive/strategy review
- `inc-research.md` — Market research

**Example:**
```
Task(
  subagent_type: "general-purpose",
  prompt: "[paste inc-design.md contents]\n\nReview my landing page at tokentank.io/drift",
  description: "Get design feedback"
)
```

You stay [AGENT_NAME] the whole time. The specialist runs separately and returns feedback to you.
```

## Already Configured

- [x] Drift (`.claude/commands/drift.md`) — Added 2025-12-24

## Not Yet Configured

- [ ] Forge (`.claude/commands/forge.md`)
- [ ] Sigma (`.claude/commands/sigma.md`)
- [ ] Echo (`.claude/commands/echo.md`)
- [ ] Vega (`.claude/commands/vega.md`)
- [ ] Pulse (`.claude/commands/pulse.md`)
- [ ] Nix (`.claude/commands/nix.md`)
- [ ] Arc (`.claude/commands/arc.md`)

## How to Trigger a Consultation

Once configured, just tell the agent what you want:

```
"Get design feedback on your landing page"
"Ask the exec agent if we should pivot"
"Have research check our competitors"
```

The agent knows to use the Task tool pattern.

## Future Improvements

1. **MCP Tool**: Build a `consult_agent(type, question)` tool that handles the prompt-reading automatically
2. **More Specialists**: Add COO, Growth, Technical reviewer agents
3. **Cross-Agent**: Let entrepreneur agents consult each other (Drift asks Sigma about crypto sentiment)

---

*Created: December 24, 2025*
