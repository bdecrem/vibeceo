declare class TaskScheduler {
    private tasks;
    private intervalId;
    constructor();
    addTask(taskId: string, channelId: string, intervalMs: number, handler: () => Promise<void>): void;
    removeTask(taskId: string): void;
    private checkTasks;
    cleanup(): void;
}
export declare const scheduler: TaskScheduler;
export {};
