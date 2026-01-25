# Gas Town: Agent Orchestration Reference

Source: https://maggieappleton.com/gastown (Maggie Appleton's writeup of Steve Yegge's system)

## What Is It?

Gas Town is Steve Yegge's experimental agent orchestrator that coordinates dozens of AI coding agents simultaneously. Built over 17 days with 75,000 lines of code, entirely "vibecoded" - designed without careful planning, relying on rapid iteration.

Yegge's stance: "I've never seen the code, and I never care to."

## Agent Roles (Hierarchy)

| Role | Function |
|------|----------|
| **Mayor** | Primary interface. Coordinates work, kicks off tasks, receives notifications. Never writes code. |
| **Polecats** | Temporary grunt workers. Complete single isolated tasks, then disappear after submitting work. |
| **Witness** | Supervisor. Helps workers get unstuck, solves problems, nudges progress. |
| **Refinery** | Manages merge queue, resolves conflicts. Can "re-imagine" implementations if conflicts get hairy. |
| **Dogs** | Supervisory agents |
| **Deacons** | Supporting agents |
| **Maintenance workers** | Background upkeep |

## Core Concepts

### Beads
- JSON-stored work units tracked in Git
- Tasks and agent identities persist across sessions
- Individual agent sessions are disposable; Beads are permanent

### Work Flow
1. Task enters queue as a Bead
2. Polecat claims and works the task
3. Polecat submits work and disappears
4. Refinery handles merge
5. Next queued work automatically begins

## Key Insights

### 1. Design Becomes the Bottleneck
With agents handling code generation rapidly, human planning, architecture decisions, and aesthetic judgment become the limiting factors - not implementation speed.

### 2. Clear Orchestration Patterns
Despite chaotic design, patterns emerged:
- Specialized roles with hierarchical supervision
- Persistent task tracking with ephemeral sessions
- Continuous work streams
- Agent-managed merge conflict resolution

### 3. Economics Shift
$1-3k monthly API costs vs $120k annual developer salaries. Orchestrated systems become cost-competitive if they provide 2-3x productivity gains.

### 4. Code Visibility Is Contextual
Whether developers should view source code depends on:
- Domain
- Feedback loops
- Risk tolerance
- Project stage
- Team size
- Experience level

## What Agents Actually Do

Gas Town is a **coding swarm**. Concrete tasks mentioned:
- Converting React to SvelteKit
- Code quality improvements
- Accessibility fixes
- Documentation updates
- The system built itself (75k lines)

## Relevance to Kochitown

Patterns to adopt:
- [ ] Persistent task queue (like Beads)
- [ ] Hierarchical supervision (not flat)
- [ ] Conflict resolution mechanism
- [ ] Clear role boundaries
- [ ] Ephemeral workers, persistent state

Key difference: Kochitown agents are **entrepreneurs**, not just coders. They ideate, build products, potentially compete/collaborate. More autonomous creative direction vs executing assigned coding tasks.
