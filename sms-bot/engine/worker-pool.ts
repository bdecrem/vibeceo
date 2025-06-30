import { MAX_CONCURRENT_WORKERS, WORKER_TIMEOUT_MS } from './shared/config.js';
import { logWithTimestamp, logSuccess, logError, logWarning } from './shared/logger.js';
import { parseFileContent, determineRequestType, moveProcessedFile } from './file-watcher.js';

// Worker task interface
export interface WorkerTask {
    processingPath: string;
    originalPath: string;
    taskId: string;
    timestamp: number;
}

// Worker pool class
export class WorkerPool {
    private workers: Worker[] = [];
    private taskQueue: WorkerTask[] = [];
    private activeTasks: Map<string, WorkerTask> = new Map();
    private isRunning: boolean = false;
    private maxWorkers: number;

    constructor(maxWorkers: number = MAX_CONCURRENT_WORKERS) {
        this.maxWorkers = maxWorkers;
    }

    /**
     * Start the worker pool
     */
    async start() {
        if (this.isRunning) {
            logWarning("Worker pool already running");
            return;
        }

        this.isRunning = true;
        logWithTimestamp(`🚀 Starting worker pool with ${this.maxWorkers} workers`);

        // Initialize workers
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker(i + 1, this);
            this.workers.push(worker);
            worker.start();
        }

        logSuccess(`✅ Worker pool started with ${this.workers.length} workers`);
    }

    /**
     * Stop the worker pool
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        logWithTimestamp("🛑 Stopping worker pool...");
        this.isRunning = false;

        // Stop all workers
        await Promise.all(this.workers.map(worker => worker.stop()));
        this.workers = [];
        this.taskQueue = [];
        this.activeTasks.clear();

        logSuccess("✅ Worker pool stopped");
    }

    /**
     * Add tasks to the queue
     */
    addTasks(tasks: WorkerTask[]) {
        if (!this.isRunning) {
            logWarning("Cannot add tasks - worker pool not running");
            return;
        }

        // Sort tasks by timestamp to maintain chronological order
        const sortedTasks = tasks.sort((a, b) => a.timestamp - b.timestamp);
        this.taskQueue.push(...sortedTasks);

        logWithTimestamp(`📋 Added ${tasks.length} tasks to queue (${this.taskQueue.length} total queued)`);
        
        // Notify workers about new tasks
        this.notifyWorkers();
    }

    /**
     * Get next task from queue
     */
    getNextTask(): WorkerTask | null {
        return this.taskQueue.shift() || null;
    }

    /**
     * Mark task as active
     */
    markTaskActive(task: WorkerTask) {
        this.activeTasks.set(task.taskId, task);
    }

    /**
     * Mark task as completed
     */
    markTaskCompleted(taskId: string) {
        this.activeTasks.delete(taskId);
    }

    /**
     * Get pool status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            workerCount: this.workers.length,
            queuedTasks: this.taskQueue.length,
            activeTasks: this.activeTasks.size,
            availableWorkers: this.workers.filter(w => w.isAvailable()).length
        };
    }

    /**
     * Notify workers about new tasks
     */
    private notifyWorkers() {
        // Wake up any sleeping workers
        this.workers.forEach(worker => worker.wakeUp());
    }
}

// Individual worker class
class Worker {
    private id: number;
    private pool: WorkerPool;
    private isActive: boolean = false;
    private isShuttingDown: boolean = false;
    private currentTask: WorkerTask | null = null;
    private wakeUpSignal: Promise<void> | null = null;
    private wakeUpResolver: (() => void) | null = null;

    constructor(id: number, pool: WorkerPool) {
        this.id = id;
        this.pool = pool;
    }

    /**
     * Start the worker
     */
    async start() {
        this.isActive = true;
        logWithTimestamp(`👷 Worker ${this.id} started`);
        
        // Start the worker loop
        this.workerLoop().catch(error => {
            logError(`Worker ${this.id} crashed: ${error instanceof Error ? error.message : String(error)}`);
        });
    }

    /**
     * Stop the worker
     */
    async stop() {
        logWithTimestamp(`👷 Stopping worker ${this.id}...`);
        this.isShuttingDown = true;
        this.wakeUp(); // Wake up if sleeping
        
        // Wait for current task to complete
        let attempts = 0;
        while (this.currentTask && attempts < 30) { // 30 seconds max wait
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        this.isActive = false;
        logWithTimestamp(`👷 Worker ${this.id} stopped`);
    }

    /**
     * Check if worker is available
     */
    isAvailable(): boolean {
        return this.isActive && !this.currentTask && !this.isShuttingDown;
    }

    /**
     * Wake up the worker
     */
    wakeUp() {
        if (this.wakeUpResolver) {
            this.wakeUpResolver();
            this.wakeUpResolver = null;
            this.wakeUpSignal = null;
        }
    }

    /**
     * Worker main loop
     */
    private async workerLoop() {
        while (this.isActive && !this.isShuttingDown) {
            try {
                // Get next task
                const task = this.pool.getNextTask();
                
                if (!task) {
                    // No tasks available, wait for wake up signal
                    await this.waitForWakeUp();
                    continue;
                }

                // Process the task
                await this.processTask(task);
                
            } catch (error) {
                logError(`Worker ${this.id} error: ${error instanceof Error ? error.message : String(error)}`);
                // Continue processing other tasks even if one fails
            }
        }
    }

    /**
     * Wait for wake up signal
     */
    private async waitForWakeUp() {
        if (!this.wakeUpSignal) {
            this.wakeUpSignal = new Promise(resolve => {
                this.wakeUpResolver = resolve;
            });
        }
        
        // Wait for wake up or timeout (10 seconds)
        await Promise.race([
            this.wakeUpSignal,
            new Promise(resolve => setTimeout(resolve, 10000))
        ]);
    }

    /**
     * Process a single task
     */
    private async processTask(task: WorkerTask) {
        this.currentTask = task;
        this.pool.markTaskActive(task);
        
        logWithTimestamp(`👷 Worker ${this.id} processing: ${task.processingPath}`);
        
        const startTime = Date.now();
        let success = false;
        
        try {
            // Set timeout for the entire task
            const taskPromise = this.executeTask(task);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Task timeout after ${WORKER_TIMEOUT_MS}ms`)), WORKER_TIMEOUT_MS);
            });
            
            await Promise.race([taskPromise, timeoutPromise]);
            success = true;
            
            const duration = Date.now() - startTime;
            logSuccess(`✅ Worker ${this.id} completed task in ${duration}ms`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            logError(`❌ Worker ${this.id} failed task after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`);
            success = false;
        } finally {
            // Clean up
            this.pool.markTaskCompleted(task.taskId);
            this.currentTask = null;
            
            // Move processed file
            await moveProcessedFile(task.processingPath, success);
        }
    }

    /**
     * Execute the actual task processing
     */
    private async executeTask(task: WorkerTask) {
        // Parse file content
        const fileData = await parseFileContent(task.processingPath);
        if (!fileData) {
            throw new Error(`Failed to parse file: ${task.processingPath}`);
        }

        // Determine request type
        const requestInfo = determineRequestType(fileData.userPrompt, task.processingPath);

        // Import processing functions dynamically to avoid circular dependencies
        const { processWtafRequest, processEditRequest, processRemixRequest } = await import('./controller.js');

        // Process based on request type
        if (requestInfo.type === 'wtaf' || requestInfo.type === 'code') {
            await processWtafRequest(task.processingPath, fileData, requestInfo);
        } else if (requestInfo.type === 'edit') {
            await processEditRequest(task.processingPath, fileData, requestInfo);
        } else if (requestInfo.type === 'remix') {
            await processRemixRequest(task.processingPath, fileData, requestInfo);
        } else {
            throw new Error(`Unknown request type: ${requestInfo.type}`);
        }
    }
} 