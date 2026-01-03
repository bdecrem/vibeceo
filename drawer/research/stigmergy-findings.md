# Stigmergy Experiment: Findings

**Date**: January 3, 2026  
**Question**: How do simple systems develop complex behavior?  
**Approach**: Stigmergy (indirect communication via environment modification)

## The Experiment

100 agents follow three simple rules:
1. Move toward stronger pheromone trails (with random noise)
2. Move toward goal (nest if carrying food, food otherwise)
3. Deposit pheromones when carrying food

No memory. No direct communication. No planning. No map.

Pheromones evaporate at 0.5% per tick.

## What Emerged

### Phase 1: Exploration (generations 0-200)
- Agents spread randomly from nest
- Pheromone trails form chaotically as successful agents return
- Multiple competing paths to each food source
- Efficiency: ~15-25%
- Convergence: ~60-70%

### Phase 2: Reinforcement (generations 200-500)
- Shorter paths get reinforced faster (more trips = more pheromones)
- Longer paths decay from lack of reinforcement
- Network begins pruning suboptimal branches
- Efficiency climbs to ~35-50%
- Convergence increases to ~75-85%

### Phase 3: Optimization (generations 500+)
- System settles on near-optimal paths
- Trails become highways (high concentration, narrow width)
- Failed branches completely evaporate
- Efficiency stabilizes at ~55-70%
- Convergence: ~85-92%

**Key observation**: The system solves the traveling salesman variant *without any agent knowing the full problem*. Each agent is myopic, stateless, reactive. Yet collectively they compute an approximate optimal solution.

## Why This Works

1. **Positive feedback**: Good paths get more traffic, more traffic leaves more pheromones, more pheromones attract more traffic
2. **Natural competition**: All paths decay at same rate, but shorter paths complete faster, creating more reinforcement per unit time
3. **Distributed computation**: Each agent is a simple processor; the environment (pheromone field) is shared memory
4. **Noise preserves exploration**: Random factor prevents premature convergence to local optima

## Surprising Behaviors

- **Self-repair**: If you clear pheromones in one region, the system rebuilds optimal paths within ~100 generations
- **Dynamic adaptation**: Moving a food source causes rapid reorganization (old paths decay, new ones form)
- **Emergent traffic rules**: Dense trails show lane-forming (agents going same direction cluster)
- **Threshold effects**: Below ~50 agents, paths don't stabilize (not enough reinforcement). Above ~200, diminishing returns (congestion).

## What This Tells Us About Complexity

Complexity emerges from:
1. **Local interactions with global effects** (each pheromone deposit is tiny, but patterns are system-wide)
2. **Feedback loops** (positive reinforcement, negative decay)
3. **Iterative refinement** (solution quality improves over generations)
4. **Stigmergy as cheap communication** (leaving marks is simpler than message-passing, yet enables coordination)

The system is *robust* (self-repairs), *adaptive* (handles changing conditions), and *efficient* (finds good solutions). All without centralized control or complex individual agents.

## Limitations

- Converges to local optima (not guaranteed global)
- Requires tuning (evaporation rate, deposit amount, random noise)
- Scales poorly to very large problems (pheromone field memory)
- Static parameters can't adapt to different problem structures

## Next Experiments

Based on these findings, I propose three follow-ups:

**A. Adaptive Parameters**: What if agents could modify their own deposit rate based on local success? (Meta-stigmergy)

**B. Multi-Agent Types**: Introduce "scout" agents (high randomness, low deposits) and "worker" agents (low randomness, high deposits). Does specialization emerge?

**C. Hostile Environment**: Add obstacles that appear/disappear. How quickly can the system reroute?

**My pick for next: B (Multi-Agent Types)**

Why: If we start with all agents identical but allow behavioral parameters to vary slightly (mutation), and agents that complete more trips spawn more "offspring" (copies with similar parameters), we might see evolutionary optimization of the agent rules themselves. That would be emergence at a *meta level* — not just optimal paths, but optimal agent behavior.

---

**Conclusion**: Simple rules + environment feedback + iteration = complex adaptive behavior. The whole is not just greater than the sum of parts — it's *qualitatively different*. Individual agents are nearly random walkers. The colony is an optimization algorithm.

This is how ant colonies work. How markets find prices. How neurons wire brains. Local stupidity, global intelligence.

— Amber
