/**
 * Amber Awareness Agent
 *
 * Runs twice daily to scan the environment and alert Bart to notable changes.
 *
 * Scans:
 * - Git activity (commits in last 24h)
 * - Drift's P&L (live trading agent)
 * - Kochi subscriber count
 *
 * Writes findings to drawer/AWARENESS.md
 * Texts Bart only if something notable happened
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { registerDailyJob } from "../../lib/scheduler/index.js";
import { sendSmsResponse } from "../../lib/sms/handlers.js";
import type { TwilioClient } from "../../lib/sms/webhooks.js";
import { createClient } from "@supabase/supabase-js";

const execAsync = promisify(exec);

// Bart's phone number for alerts
const BART_PHONE = "+16508989508";

// Times to run (PT)
const MORNING_HOUR = 7;
const MORNING_MINUTE = 30;
const EVENING_HOUR = 18;
const EVENING_MINUTE = 0;

// Paths - resolve from this file's location
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const AWARENESS_FILE = path.join(REPO_ROOT, "drawer", "AWARENESS.md");
const DRIFT_LOG = path.join(REPO_ROOT, "incubator", "i3-2", "LOG.md");

interface AwarenessState {
  timestamp: string;
  drift: {
    portfolio: number;
    totalPnL: number;
    totalPnLPercent: number;
    lastTrade: string;
  } | null;
  kochi: {
    subscribers: number;
  } | null;
  recentCommits: number;
}

interface Alert {
  type: "drift" | "kochi" | "git";
  message: string;
  priority: "high" | "medium" | "low";
}

/**
 * Parse Drift's LOG.md to extract current P&L
 */
async function parseDriftStatus(): Promise<AwarenessState["drift"]> {
  try {
    const content = await fs.readFile(DRIFT_LOG, "utf-8");

    // Look for the portfolio line: **Portfolio**: $495.08
    const portfolioMatch = content.match(/\*\*Portfolio\*\*:\s*\$?([\d,]+\.?\d*)/);
    const portfolio = portfolioMatch ? parseFloat(portfolioMatch[1].replace(",", "")) : 0;

    // Look for total P&L: **Total from $500**: -$4.92 (-0.98%)
    const pnlMatch = content.match(/\*\*(?:Total from \$500|From \$500)\*\*:\s*([+-]?\$?[\d,]+\.?\d*)\s*\(([+-]?[\d.]+)%\)/);
    const totalPnL = pnlMatch ? parseFloat(pnlMatch[1].replace(/[$,]/g, "")) : 0;
    const totalPnLPercent = pnlMatch ? parseFloat(pnlMatch[2]) : 0;

    // Get the date of the most recent entry
    const dateMatch = content.match(/##\s+(\d{4}-\d{2}-\d{2}):/);
    const lastTrade = dateMatch ? dateMatch[1] : "unknown";

    return { portfolio, totalPnL, totalPnLPercent, lastTrade };
  } catch (error) {
    console.error("[amber] Failed to parse Drift log:", error);
    return null;
  }
}

/**
 * Get Kochi subscriber count from Supabase
 */
async function getKochiSubscribers(): Promise<number | null> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[amber] Supabase not configured");
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase
      .from("sms_subscribers")
      .select("*", { count: "exact", head: true })
      .or("unsubscribed.is.null,unsubscribed.eq.false");

    if (error) {
      console.error("[amber] Supabase query failed:", error);
      return null;
    }

    return count;
  } catch (error) {
    console.error("[amber] Failed to get Kochi subscribers:", error);
    return null;
  }
}

/**
 * Count recent git commits
 */
async function getRecentCommits(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `cd "${REPO_ROOT}" && git log --oneline --since="24 hours ago" | wc -l`
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch (error) {
    console.error("[amber] Failed to get git commits:", error);
    return 0;
  }
}

/**
 * Load previous awareness state
 */
async function loadPreviousState(): Promise<AwarenessState | null> {
  try {
    const content = await fs.readFile(AWARENESS_FILE, "utf-8");

    // Parse the markdown to extract previous values
    const timestampMatch = content.match(/\*\*Last scan\*\*:\s*(.+)/);
    const portfolioMatch = content.match(/\*\*Portfolio\*\*:\s*\$?([\d,]+\.?\d*)/);
    const subscribersMatch = content.match(/\*\*Subscribers\*\*:\s*(\d+)/);

    if (!timestampMatch) return null;

    return {
      timestamp: timestampMatch[1],
      drift: portfolioMatch ? {
        portfolio: parseFloat(portfolioMatch[1].replace(",", "")),
        totalPnL: 0,
        totalPnLPercent: 0,
        lastTrade: "unknown"
      } : null,
      kochi: subscribersMatch ? {
        subscribers: parseInt(subscribersMatch[1], 10)
      } : null,
      recentCommits: 0
    };
  } catch {
    return null;
  }
}

/**
 * Generate alerts based on current vs previous state
 */
function generateAlerts(
  current: AwarenessState,
  previous: AwarenessState | null
): Alert[] {
  const alerts: Alert[] = [];

  // Drift alerts
  if (current.drift) {
    const { portfolio, totalPnLPercent, lastTrade } = current.drift;

    // Alert on significant P&L change
    if (Math.abs(totalPnLPercent) >= 5) {
      const direction = totalPnLPercent > 0 ? "up" : "down";
      alerts.push({
        type: "drift",
        message: `Drift is ${direction} ${Math.abs(totalPnLPercent).toFixed(1)}% (portfolio: $${portfolio.toFixed(2)})`,
        priority: Math.abs(totalPnLPercent) >= 10 ? "high" : "medium"
      });
    }

    // Alert if Drift hasn't traded in 2+ days
    if (lastTrade !== "unknown") {
      const lastTradeDate = new Date(lastTrade);
      const daysSinceLastTrade = Math.floor((Date.now() - lastTradeDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastTrade >= 2) {
        alerts.push({
          type: "drift",
          message: `Drift hasn't logged activity in ${daysSinceLastTrade} days`,
          priority: daysSinceLastTrade >= 3 ? "high" : "medium"
        });
      }
    }
  }

  // Kochi subscriber alerts
  if (current.kochi && previous?.kochi) {
    const diff = current.kochi.subscribers - previous.kochi.subscribers;
    if (Math.abs(diff) >= 5) {
      const direction = diff > 0 ? "gained" : "lost";
      alerts.push({
        type: "kochi",
        message: `Kochi ${direction} ${Math.abs(diff)} subscribers (now ${current.kochi.subscribers})`,
        priority: Math.abs(diff) >= 10 ? "high" : "medium"
      });
    }
  }

  return alerts;
}

/**
 * Write awareness state to markdown file
 */
async function writeAwarenessFile(state: AwarenessState, alerts: Alert[]): Promise<void> {
  const timestamp = new Date().toISOString();

  let content = `# Amber Awareness

**Last scan**: ${timestamp}

---

## Current State

### Drift (Live Trading)
`;

  if (state.drift) {
    content += `- **Portfolio**: $${state.drift.portfolio.toFixed(2)}
- **Total P&L**: ${state.drift.totalPnL >= 0 ? "+" : ""}$${state.drift.totalPnL.toFixed(2)} (${state.drift.totalPnLPercent >= 0 ? "+" : ""}${state.drift.totalPnLPercent.toFixed(2)}%)
- **Last Activity**: ${state.drift.lastTrade}
`;
  } else {
    content += `- *Could not read Drift status*\n`;
  }

  content += `
### Kochi
`;
  if (state.kochi) {
    content += `- **Subscribers**: ${state.kochi.subscribers}
`;
  } else {
    content += `- *Could not read Kochi status*\n`;
  }

  content += `
### Git Activity (24h)
- **Commits**: ${state.recentCommits}

---

## Recent Alerts

`;

  if (alerts.length > 0) {
    for (const alert of alerts) {
      const icon = alert.priority === "high" ? "🚨" : alert.priority === "medium" ? "⚠️" : "ℹ️";
      content += `- ${icon} **${alert.type}**: ${alert.message}\n`;
    }
  } else {
    content += `*No alerts*\n`;
  }

  content += `
---

*This file is auto-generated by the Amber awareness agent.*
`;

  await fs.writeFile(AWARENESS_FILE, content, "utf-8");
  console.log("[amber] Wrote awareness file");
}

/**
 * Run the awareness scan
 */
export async function runAwarenessScan(twilioClient?: TwilioClient): Promise<void> {
  console.log("[amber] Starting awareness scan...");

  // Gather current state
  const [drift, subscribers, recentCommits] = await Promise.all([
    parseDriftStatus(),
    getKochiSubscribers(),
    getRecentCommits()
  ]);

  const currentState: AwarenessState = {
    timestamp: new Date().toISOString(),
    drift,
    kochi: subscribers !== null ? { subscribers } : null,
    recentCommits
  };

  // Load previous state and generate alerts
  const previousState = await loadPreviousState();
  const alerts = generateAlerts(currentState, previousState);

  // Write awareness file
  await writeAwarenessFile(currentState, alerts);

  // Text Bart if there are high-priority alerts
  const highPriorityAlerts = alerts.filter(a => a.priority === "high");
  if (highPriorityAlerts.length > 0 && twilioClient) {
    const message = `🔔 Amber Alert:\n${highPriorityAlerts.map(a => `• ${a.message}`).join("\n")}`;
    try {
      await sendSmsResponse(BART_PHONE, message, twilioClient);
      console.log("[amber] Sent alert to Bart");
    } catch (error) {
      console.error("[amber] Failed to send SMS:", error);
    }
  }

  console.log(`[amber] Scan complete. ${alerts.length} alerts (${highPriorityAlerts.length} high priority)`);
}

/**
 * Register the twice-daily awareness jobs
 */
export function registerAmberAwarenessJobs(twilioClient: TwilioClient): void {
  // Morning scan (7:30 AM PT)
  registerDailyJob({
    name: "amber-awareness-morning",
    hour: MORNING_HOUR,
    minute: MORNING_MINUTE,
    timezone: "America/Los_Angeles",
    async run() {
      await runAwarenessScan(twilioClient);
    },
    onError(error) {
      console.error("[amber] Morning scan failed:", error);
    }
  });

  // Evening scan (6:00 PM PT)
  registerDailyJob({
    name: "amber-awareness-evening",
    hour: EVENING_HOUR,
    minute: EVENING_MINUTE,
    timezone: "America/Los_Angeles",
    async run() {
      await runAwarenessScan(twilioClient);
    },
    onError(error) {
      console.error("[amber] Evening scan failed:", error);
    }
  });

  console.log(`[amber] Registered awareness scans for ${MORNING_HOUR}:${String(MORNING_MINUTE).padStart(2, "0")} and ${EVENING_HOUR}:${String(EVENING_MINUTE).padStart(2, "0")} PT`);
}
