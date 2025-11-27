/**
 * Metrics Tracking for Agent Execution
 * Collects performance metrics, token usage, and cost estimation
 */

interface StepMetrics {
  [stepName: string]: number; // Duration in milliseconds
}

export class MetricsCollector {
  private startTime: number;
  private sourcesFetched: number = 0;
  private itemsProcessed: number = 0;
  private llmCallsMade: number = 0;
  private tokensUsed: number = 0;
  private stepMetrics: StepMetrics = {};
  private stepStartTimes: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark the start of a step for timing
   */
  startStep(stepName: string): void {
    this.stepStartTimes.set(stepName, Date.now());
  }

  /**
   * Mark the end of a step and record its duration
   */
  endStep(stepName: string): void {
    const startTime = this.stepStartTimes.get(stepName);
    if (startTime) {
      this.stepMetrics[stepName] = Date.now() - startTime;
      this.stepStartTimes.delete(stepName);
    }
  }

  /**
   * Increment source fetch count
   */
  incrementSources(count: number = 1): void {
    this.sourcesFetched += count;
  }

  /**
   * Set total items processed
   */
  setItemsProcessed(count: number): void {
    this.itemsProcessed = count;
  }

  /**
   * Increment items processed
   */
  incrementItems(count: number): void {
    this.itemsProcessed += count;
  }

  /**
   * Record an LLM API call
   */
  addLLMCall(model: string, tokensUsed: number): void {
    this.llmCallsMade++;
    this.tokensUsed += tokensUsed;
  }

  /**
   * Get total duration since start
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Estimate cost based on token usage
   */
  estimateCost(): number {
    // Approximate costs per 1K tokens (as of 2025)
    const COST_PER_1K_TOKENS: Record<string, number> = {
      'gpt-4': 0.06, // Average of input and output
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.045,
      'claude-3-sonnet': 0.009,
    };

    // Use GPT-4 pricing as default estimate
    const avgCostPer1K = 0.06;
    return (this.tokensUsed / 1000) * avgCostPer1K;
  }

  /**
   * Serialize metrics to JSON for database storage
   */
  toJSON() {
    return {
      sourcesFetched: this.sourcesFetched,
      itemsProcessed: this.itemsProcessed,
      llmCallsMade: this.llmCallsMade,
      tokensUsed: this.tokensUsed,
      durationMs: this.getDuration(),
      estimatedCost: this.estimateCost(),
      steps: this.stepMetrics,
    };
  }

  /**
   * Get summary string for logging
   */
  getSummary(): string {
    return [
      `Sources: ${this.sourcesFetched}`,
      `Items: ${this.itemsProcessed}`,
      `LLM Calls: ${this.llmCallsMade}`,
      `Tokens: ${this.tokensUsed}`,
      `Duration: ${this.getDuration()}ms`,
      `Est. Cost: $${this.estimateCost().toFixed(4)}`,
    ].join(', ');
  }
}
