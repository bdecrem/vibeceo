/**
 * Amber Agent Command Handler
 *
 * On-demand testing and control of Amber's background services.
 * All commands run in dry-run mode (no SMS alerts sent) unless specified.
 *
 * Commands:
 * - AMBER SCAN           → Run awareness scan (dry-run)
 * - AMBER EMAIL          → Process actionable emails (dry-run)
 * - AMBER STATUS         → Show current awareness state
 * - AMBER SERVICES       → List available services
 * - AMBER HELP           → Show command reference
 */

import type { CommandContext, CommandHandler } from './types.js';
import { runAwarenessScan } from '../agents/amber/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Paths
const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const AWARENESS_FILE = path.join(REPO_ROOT, 'drawer', 'AWARENESS.md');

// Bart's phone for admin check
const BART_PHONE = '+16508989508';

/**
 * Parse the awareness file to get a summary
 */
async function getAwarenessStatus(): Promise<string> {
  try {
    const content = await fs.readFile(AWARENESS_FILE, 'utf-8');

    // Extract key info
    const lastScan = content.match(/\*\*Last scan\*\*:\s*(.+)/)?.[1] || 'unknown';
    const portfolio = content.match(/\*\*Portfolio\*\*:\s*\$?([\d,]+\.?\d*)/)?.[1] || '?';
    const pnl = content.match(/\*\*Total P&L\*\*:\s*([^\n]+)/)?.[1] || '?';
    const subscribers = content.match(/\*\*Subscribers\*\*:\s*(\d+)/)?.[1] || '?';
    const unread = content.match(/\*\*Unread\*\*:\s*(\d+)/)?.[1] || '?';

    // Extract alerts
    const alertsSection = content.match(/## Recent Alerts\n\n([\s\S]*?)(?:\n---|\n\*This file)/)?.[1] || '';
    const alerts = alertsSection.trim() || 'No alerts';

    // Parse last scan time
    let scanAge = '';
    try {
      const scanDate = new Date(lastScan);
      const ageMs = Date.now() - scanDate.getTime();
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const ageMins = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
      scanAge = ageHours > 0 ? `${ageHours}h ${ageMins}m ago` : `${ageMins}m ago`;
    } catch {
      scanAge = 'unknown';
    }

    return `📊 Amber Status\n\n` +
      `Last scan: ${scanAge}\n` +
      `Drift: $${portfolio} (${pnl})\n` +
      `Kochi: ${subscribers} subs\n` +
      `Gmail: ${unread} unread\n\n` +
      `Alerts:\n${alerts}`;
  } catch (error) {
    return `Could not read awareness file: ${error}`;
  }
}

export const amberCommandHandler: CommandHandler = {
  name: 'amber-agent',

  matches(context: CommandContext): boolean {
    const normalized = context.messageUpper.trim();
    const words = normalized.split(/\s+/);

    // Only match AMBER + known subcommand
    if (words[0] !== 'AMBER' || words.length < 2) return false;

    const subcommands = ['SCAN', 'EMAIL', 'STATUS', 'HELP', 'SERVICES'];
    return subcommands.includes(words[1]);
  },

  async handle(context: CommandContext): Promise<boolean> {
    const { message, from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;
    const normalized = message.toUpperCase().trim();
    const words = normalized.split(/\s+/);
    const subcommand = words[1];

    // Helper to send response
    const reply = async (msg: string) => {
      await sendSmsResponse(from, msg, twilioClient);
      await updateLastMessageDate(normalizedFrom);
    };

    // Admin check for certain commands
    const isAdmin = from === BART_PHONE || normalizedFrom === BART_PHONE.replace('+1', '');

    switch (subcommand) {
      case 'HELP':
      case 'SERVICES': {
        await reply(
          `🔶 Amber Agent Services\n\n` +
          `AMBER SCAN — Run awareness scan (dry-run)\n` +
          `AMBER EMAIL — Process emails (coming soon)\n` +
          `AMBER STATUS — Current state\n\n` +
          `Scheduled: 7:30am + 6pm PT`
        );
        return true;
      }

      case 'STATUS': {
        const status = await getAwarenessStatus();
        await reply(status);
        return true;
      }

      case 'SCAN': {
        if (!isAdmin) {
          await reply(`Admin only. Text from registered number.`);
          return true;
        }

        await reply(`Running awareness scan (dry-run)...`);

        try {
          // Run scan WITHOUT twilioClient = dry-run (no SMS alerts)
          await runAwarenessScan(undefined);

          // Get the updated status
          const status = await getAwarenessStatus();
          await reply(`✅ Scan complete (no alerts sent)\n\n${status}`);
        } catch (error) {
          await reply(`❌ Scan failed: ${error}`);
        }
        return true;
      }

      case 'EMAIL': {
        if (!isAdmin) {
          await reply(`Admin only.`);
          return true;
        }

        await reply(`📧 Email processing coming soon.\n\nThis will scan for actionable emails and take configured actions.`);
        return true;
      }

      default: {
        await reply(`Unknown subcommand: ${subcommand}\n\nTry: AMBER HELP`);
        return true;
      }
    }
  },
};
