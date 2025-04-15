class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.intervalId = null;
        // Check tasks every minute
        this.intervalId = setInterval(() => this.checkTasks(), 60000);
    }
    addTask(taskId, channelId, intervalMs, handler) {
        this.tasks.set(taskId, {
            channelId,
            intervalMs,
            lastRun: Date.now(),
            handler
        });
    }
    removeTask(taskId) {
        this.tasks.delete(taskId);
    }
    async checkTasks() {
        const now = Date.now();
        for (const [taskId, task] of this.tasks.entries()) {
            if (!task.lastRun || (now - task.lastRun >= task.intervalMs)) {
                try {
                    await task.handler();
                    task.lastRun = now;
                }
                catch (error) {
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
