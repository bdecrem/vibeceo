import { Message } from 'discord.js';

interface ScheduledTask {
  channelId: string;
  intervalMs: number;
  lastRun?: number;
  handler: () => Promise<void>;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Check tasks every 10 seconds
    this.intervalId = setInterval(() => this.checkTasks(), 10000);
  }

  addTask(taskId: string, channelId: string, intervalMs: number, handler: () => Promise<void>) {
    this.tasks.set(taskId, {
      channelId,
      intervalMs,
      lastRun: Date.now(),
      handler
    });
  }

  removeTask(taskId: string) {
    this.tasks.delete(taskId);
  }

  private async checkTasks() {
    const now = Date.now();
    for (const [taskId, task] of this.tasks.entries()) {
      if (!task.lastRun || (now - task.lastRun >= task.intervalMs)) {
        try {
          await task.handler();
          task.lastRun = now;
        } catch (error) {
          console.error(`Error running task ${taskId}:`, error);
        }
      }
    }
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.tasks.clear();
  }
}

// Export a singleton instance
export const scheduler = new TaskScheduler(); 