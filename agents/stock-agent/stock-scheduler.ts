/**
 * Stock Scheduler Service
 *
 * Handles scheduled stock updates, portfolio summaries, and alerts
 * Runs as a background service to execute tasks at specified times
 */

import { supabase } from "../supabase.js";
import { sendSmsResponse } from "./handlers.js";
import { getStockData } from "./stock-api.js";
import { getUserStockProfile } from "./stock-agent.js";
import { initializeTwilioClient } from "./webhooks.js";
import type { StockData } from "./stock-api.js";

export interface ScheduledTask {
  id: string;
  phone_number: string;
  task_type:
    | "daily_update"
    | "portfolio_summary"
    | "stock_price"
    | "market_analysis";
  schedule_time: string;
  timezone: string;
  is_active: boolean;
  task_config: any;
  last_executed: string | null;
  next_execution: string | null;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  execution_time: string;
  status: "success" | "failed" | "skipped";
  message_sent: boolean;
  error_message: string | null;
  response_data: any;
}

// In-memory storage for testing (replace with database in production)
const scheduledTasks: Map<string, ScheduledTask> = new Map();
const taskExecutions: Map<string, TaskExecution[]> = new Map();

/**
 * Initialize the scheduler service
 */
export async function initializeScheduler(): Promise<void> {
  console.log("🕐 Initializing Stock Scheduler Service...");

  // Start the main scheduler loop
  // Check every 5 minutes in production, 1 minute in development
  const checkInterval = process.env.NODE_ENV === "production" ? 300000 : 60000;
  setInterval(async () => {
    await processScheduledTasks();
  }, checkInterval);

  console.log("✅ Stock Scheduler Service initialized");
}

/**
 * Process all scheduled tasks that are due for execution
 */
async function processScheduledTasks(): Promise<void> {
  try {
    const now = new Date();
    console.log(`🕐 Checking scheduled tasks at ${now.toISOString()}`);

    // Get all active tasks that are due for execution
    const tasks = Array.from(scheduledTasks.values()).filter(
      (task) =>
        task.is_active &&
        task.next_execution &&
        new Date(task.next_execution) <= now
    );

    if (tasks.length === 0) {
      console.log("📭 No scheduled tasks due for execution");
      return;
    }

    console.log(`📋 Found ${tasks.length} tasks due for execution`);

    // Process each task
    for (const task of tasks) {
      await executeScheduledTask(task);
    }
  } catch (error) {
    console.error("❌ Error processing scheduled tasks:", error);
  }
}

/**
 * Execute a single scheduled task
 */
async function executeScheduledTask(task: ScheduledTask): Promise<void> {
  console.log(`🚀 Executing task ${task.id} for ${task.phone_number}`);

  try {
    let result: string;
    let status: "success" | "failed" | "skipped" = "success";
    let errorMessage: string | null = null;

    // Execute the task based on type
    switch (task.task_type) {
      case "daily_update":
        result = await executeDailyUpdate(task);
        break;
      case "portfolio_summary":
        result = await executePortfolioSummary(task);
        break;
      case "stock_price":
        result = await executeStockPrice(task);
        break;
      case "market_analysis":
        result = await executeMarketAnalysis(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }

    // Send SMS response
    try {
      const twilioClient = initializeTwilioClient();
      await sendSmsResponse(task.phone_number, result, twilioClient);
      console.log(
        `📱 Sent SMS to ${task.phone_number}: ${result.substring(0, 100)}...`
      );
    } catch (smsError) {
      console.error(`❌ Error sending SMS to ${task.phone_number}:`, smsError);
      errorMessage = `SMS sending failed: ${
        smsError instanceof Error ? smsError.message : "Unknown error"
      }`;
      status = "failed";
    }

    // Record successful execution
    await recordTaskExecution(task.id, "success", true, null, {
      message: result,
    });

    // Update next execution time
    await updateNextExecutionTime(task.id);

    console.log(`✅ Task ${task.id} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing task ${task.id}:`, error);

    // Record failed execution
    await recordTaskExecution(
      task.id,
      "failed",
      false,
      error instanceof Error ? error.message : "Unknown error",
      {}
    );
  }
}

/**
 * Execute daily update task
 */
async function executeDailyUpdate(task: ScheduledTask): Promise<string> {
  const config = task.task_config || {};
  const symbols = config.symbols || [];

  if (symbols.length === 0) {
    return "📈 Daily Stock Update\n\nNo stocks configured for daily updates. Add stocks to your watchlist to receive daily updates.";
  }

  let message = "📈 Daily Stock Update\n\n";

  for (const symbol of symbols) {
    try {
      const stockData = await getStockData(symbol);
      if (stockData) {
        message += `📊 ${symbol.toUpperCase()}\n`;
        message += `💰 Current: $${stockData.currentPrice.toFixed(2)}\n`;
        message += `📈 7-Day: $${stockData.change.toFixed(
          2
        )} (${stockData.changePercent.toFixed(2)}%)\n`;
        message += `📊 Volume: ${
          stockData.volume?.toLocaleString() || "N/A"
        }\n\n`;
      }
    } catch (error) {
      message += `❌ ${symbol.toUpperCase()}: Error fetching data\n\n`;
    }
  }

  message += "💡 Reply 'HELP' for more commands";

  return message;
}

/**
 * Execute portfolio summary task
 */
async function executePortfolioSummary(task: ScheduledTask): Promise<string> {
  try {
    const userProfile = await getUserStockProfile(task.phone_number);
    const watchedStocks = userProfile.watchedStocks || [];

    if (watchedStocks.length === 0) {
      return "📋 Portfolio Summary\n\nYour watchlist is empty. Add stocks with 'WATCH SYMBOL' to track them.";
    }

    let message = "📋 Portfolio Summary\n\n";
    let totalValue = 0;
    let totalChange = 0;

    for (const symbol of watchedStocks) {
      try {
        const stockData = await getStockData(symbol);
        if (stockData) {
          message += `📊 ${symbol.toUpperCase()}\n`;
          message += `💰 $${stockData.currentPrice.toFixed(2)} (${
            stockData.changePercent > 0 ? "+" : ""
          }${stockData.changePercent.toFixed(2)}%)\n\n`;

          totalValue += stockData.currentPrice;
          totalChange += stockData.change;
        }
      } catch (error) {
        message += `❌ ${symbol.toUpperCase()}: Error fetching data\n\n`;
      }
    }

    message += `📈 Portfolio Total: $${totalValue.toFixed(2)} (${
      totalChange > 0 ? "+" : ""
    }${totalChange.toFixed(2)})\n\n`;
    message += "💡 Reply 'PORTFOLIO' to view detailed portfolio";

    return message;
  } catch (error) {
    return "❌ Error generating portfolio summary. Please try again later.";
  }
}

/**
 * Execute stock price task
 */
async function executeStockPrice(task: ScheduledTask): Promise<string> {
  const config = task.task_config || {};
  const symbol = config.symbol;

  if (!symbol) {
    return "❌ No stock symbol configured for price alerts.";
  }

  try {
    const stockData = await getStockData(symbol);
    if (!stockData) {
      return `❌ Could not fetch data for ${symbol.toUpperCase()}`;
    }

    return `📊 ${symbol.toUpperCase()} Stock Update\n💰 Current: $${stockData.currentPrice.toFixed(
      2
    )}\n📈 7-Day: $${stockData.change.toFixed(
      2
    )} (${stockData.changePercent.toFixed(2)}%)\n📊 Volume: ${
      stockData.volume?.toLocaleString() || "N/A"
    }`;
  } catch (error) {
    return `❌ Error fetching ${symbol.toUpperCase()} data`;
  }
}

/**
 * Execute market analysis task
 */
async function executeMarketAnalysis(task: ScheduledTask): Promise<string> {
  const config = task.task_config || {};
  const symbols = config.symbols || ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN"];

  let message = "📈 Market Analysis\n\n";

  for (const symbol of symbols.slice(0, 5)) {
    // Limit to 5 stocks
    try {
      const stockData = await getStockData(symbol);
      if (stockData) {
        const trend = stockData.changePercent > 0 ? "📈" : "📉";
        message += `${trend} ${symbol.toUpperCase()}: $${stockData.currentPrice.toFixed(
          2
        )} (${
          stockData.changePercent > 0 ? "+" : ""
        }${stockData.changePercent.toFixed(2)}%)\n`;
      }
    } catch (error) {
      message += `❌ ${symbol.toUpperCase()}: Error\n`;
    }
  }

  message += "\n💡 Reply 'HELP' for more commands";

  return message;
}

/**
 * Record task execution in database
 */
async function recordTaskExecution(
  taskId: string,
  status: "success" | "failed" | "skipped",
  messageSent: boolean,
  errorMessage: string | null,
  responseData: any
): Promise<void> {
  try {
    const execution: TaskExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task_id: taskId,
      execution_time: new Date().toISOString(),
      status,
      message_sent: messageSent,
      error_message: errorMessage,
      response_data: responseData,
    };

    if (!taskExecutions.has(taskId)) {
      taskExecutions.set(taskId, []);
    }
    taskExecutions.get(taskId)!.push(execution);

    console.log(`📝 Recorded task execution: ${taskId} - ${status}`);
  } catch (error) {
    console.error("❌ Error recording task execution:", error);
  }
}

/**
 * Update next execution time for a task
 */
async function updateNextExecutionTime(taskId: string): Promise<void> {
  try {
    const task = scheduledTasks.get(taskId);
    if (task) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      task.last_executed = new Date().toISOString();
      task.next_execution = tomorrow.toISOString();

      scheduledTasks.set(taskId, task);
      console.log(
        `📅 Updated next execution for task ${taskId} to ${tomorrow.toISOString()}`
      );
    }
  } catch (error) {
    console.error("❌ Error updating next execution time:", error);
  }
}

/**
 * Create a new scheduled task
 */
export async function createScheduledTask(
  phoneNumber: string,
  taskType:
    | "daily_update"
    | "portfolio_summary"
    | "stock_price"
    | "market_analysis",
  scheduleTime: string, // Format: "HH:MM" (e.g., "07:00")
  timezone: string = "America/New_York",
  taskConfig: any = {}
): Promise<string | null> {
  try {
    // Calculate next execution time
    const nextExecution = calculateNextExecution(scheduleTime, timezone);

    const taskId = `task_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const task: ScheduledTask = {
      id: taskId,
      phone_number: phoneNumber,
      task_type: taskType,
      schedule_time: scheduleTime,
      timezone,
      is_active: true,
      task_config: taskConfig,
      last_executed: null,
      next_execution: nextExecution.toISOString(),
    };

    scheduledTasks.set(taskId, task);

    console.log(`✅ Created scheduled task ${taskId} for ${phoneNumber}`);
    return taskId;
  } catch (error) {
    console.error("❌ Error creating scheduled task:", error);
    return null;
  }
}

/**
 * Calculate next execution time
 */
function calculateNextExecution(scheduleTime: string, timezone: string): Date {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  const nextExecution = new Date();
  nextExecution.setHours(hours, minutes, 0, 0);

  // If the scheduled time has already passed today, schedule for tomorrow
  if (nextExecution <= now) {
    nextExecution.setDate(nextExecution.getDate() + 1);
  }

  return nextExecution;
}

/**
 * Get all scheduled tasks for a user
 */
export async function getUserScheduledTasks(
  phoneNumber: string
): Promise<ScheduledTask[]> {
  try {
    const tasks = Array.from(scheduledTasks.values())
      .filter((task) => task.phone_number === phoneNumber && task.is_active)
      .sort((a, b) => a.schedule_time.localeCompare(b.schedule_time));

    return tasks;
  } catch (error) {
    console.error("❌ Error fetching user scheduled tasks:", error);
    return [];
  }
}

/**
 * Delete a scheduled task
 */
export async function deleteScheduledTask(
  taskId: string,
  phoneNumber: string
): Promise<boolean> {
  try {
    const task = scheduledTasks.get(taskId);
    if (task && task.phone_number === phoneNumber) {
      scheduledTasks.delete(taskId);
      console.log(`✅ Deleted scheduled task ${taskId}`);
      return true;
    } else {
      console.error(
        `❌ Task ${taskId} not found or doesn't belong to ${phoneNumber}`
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error deleting scheduled task:", error);
    return false;
  }
}
