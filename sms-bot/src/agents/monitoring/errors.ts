/**
 * Error Tracking for Agent Execution
 * Collects and formats errors from each execution step
 */

interface ErrorEntry {
  step: string;
  message: string;
  stack?: string;
  timestamp: string;
}

export class ErrorCollector {
  private errors: ErrorEntry[] = [];

  /**
   * Add an error from a specific step
   */
  addError(step: string, error: Error | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    this.errors.push({
      step,
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if any errors have been collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get error count
   */
  getCount(): number {
    return this.errors.length;
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Serialize errors to JSON for database storage
   */
  toJSON() {
    return this.errors.map(err => ({
      step: err.step,
      message: err.message,
      stack: err.stack,
    }));
  }

  /**
   * Get summary string for logging
   */
  getSummary(): string {
    if (this.errors.length === 0) {
      return 'No errors';
    }

    return this.errors
      .map(err => `[${err.step}] ${err.message}`)
      .join('; ');
  }

  /**
   * Get the first error (useful for displaying primary failure reason)
   */
  getFirstError(): ErrorEntry | null {
    return this.errors[0] || null;
  }
}
