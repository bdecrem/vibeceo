/**
 * SMS Command Handler for arXiv Research Agent
 *
 * Handles all ARXIV commands for the AI research papers daily digest
 */

import {
  ARXIV_AGENT_SLUG,
  buildArxivReportMessage,
  getLatestStoredArxivReport,
  runAndStoreArxivReport,
} from '../agents/arxiv-research/index.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import * as db from '../agents/arxiv-research/database.js';
import type { CommandContext, CommandHandler } from './types.js';

const ARXIV_RESEARCH_PREFIX = 'ARXIV-RESEARCH';
const ADMIN_PHONE = '+16508989508';

// ============================================================================
// Command Parsing
// ============================================================================

function parseArxivCommand(messageUpper: string): {
  subcommand: string;
  args: string[];
} {
  const trimmed = messageUpper.trim();

  // Handle "ARXIV-RESEARCH" prefix (deprecated agent)
  if (trimmed === ARXIV_RESEARCH_PREFIX) {
    return { subcommand: 'REPORT', args: [] };
  }

  if (!trimmed.startsWith(ARXIV_RESEARCH_PREFIX)) {
    return { subcommand: '', args: [] };
  }

  // Strip the prefix
  const remainder = trimmed.slice(ARXIV_RESEARCH_PREFIX.length).trim();

  if (!remainder) {
    return { subcommand: 'REPORT', args: [] };
  }

  const parts = remainder.split(/\s+/);
  const subcommand = parts[0] ?? 'REPORT';
  const args = parts.slice(1);

  return { subcommand, args };
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleReport(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const latest = await getLatestStoredArxivReport();

    if (!latest) {
      await sendSmsResponse(
        from,
        'No arXiv report available yet. Text ARXIV RUN to generate one now.',
        twilioClient
      );
      return true;
    }

    const message = await buildArxivReportMessage(
      latest.summary,
      latest.date,
      latest.reportPath,
      context.normalizedFrom,
      latest.podcast?.shortLink || undefined
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to fetch latest arXiv report:', error);
    await sendSmsResponse(
      from,
      '❌ Could not load the latest arXiv report. Try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Restrict to Bart only
  if (context.normalizedFrom !== ADMIN_PHONE) {
    await sendSmsResponse(
      from,
      'This command is limited to Bart.',
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  await sendSmsResponse(
    from,
    '📚 Generating a fresh arXiv research report. This will take a few minutes. I\'ll text you when it\'s ready.',
    twilioClient
  );

  try {
    const metadata = await runAndStoreArxivReport();

    const message = await buildArxivReportMessage(
      metadata.summary,
      metadata.date,
      metadata.reportPath,
      context.normalizedFrom,
      metadata.podcast?.shortLink || undefined
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to run arXiv report:', error);
    await sendSmsResponse(
      from,
      '❌ Report generation failed. Check logs for details.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(normalizedFrom, ARXIV_AGENT_SLUG);

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        '✅ You\'re already subscribed to the daily arXiv research digest.',
        twilioClient
      );
    } else {
      await subscribeToAgent(normalizedFrom, ARXIV_AGENT_SLUG);
      await sendSmsResponse(
        from,
        '✅ Subscribed! You\'ll receive the daily AI research papers digest every morning at 6 AM PT.\n\nFeaturing top papers from cs.AI, cs.LG, cs.CV, cs.CL, and stat.ML.\n\nText ARXIV UNSUBSCRIBE to stop.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to subscribe to arXiv:', error);
    await sendSmsResponse(
      from,
      '❌ Subscription failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const wasSubscribed = await isSubscribedToAgent(normalizedFrom, ARXIV_AGENT_SLUG);

    if (!wasSubscribed) {
      await sendSmsResponse(
        from,
        'You\'re not currently subscribed to the arXiv digest.',
        twilioClient
      );
    } else {
      await unsubscribeFromAgent(normalizedFrom, ARXIV_AGENT_SLUG);
      await sendSmsResponse(
        from,
        '✅ Unsubscribed from the daily arXiv research digest.\n\nYou can re-subscribe anytime with ARXIV SUBSCRIBE.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to unsubscribe from arXiv:', error);
    await sendSmsResponse(
      from,
      '❌ Unsubscribe failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleAuthorSearch(context: CommandContext, args: string[]): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  if (args.length === 0) {
    await sendSmsResponse(
      from,
      'Usage: ARXIV AUTHOR <name>\n\nExample: ARXIV AUTHOR Yann LeCun',
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  const authorName = args.join(' ');

  try {
    // Search for authors by name (partial match)
    const authors = await db.searchAuthorsByName(authorName);

    if (authors.length === 0) {
      await sendSmsResponse(
        from,
        `No authors found matching "${authorName}".\n\nTry a different name or check the spelling.`,
        twilioClient
      );
      await updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    // If exact match, show detailed info
    const exactMatch = authors.find((a) => a.name.toLowerCase() === authorName.toLowerCase());
    const author = exactMatch || authors[0];

    // Get author's papers
    const papers = await db.getPapersByAuthor(author.id);
    const featuredPapers = papers.filter((p) => p.featured_in_report);

    let message = `👤 ${author.name}\n\n`;
    message += `📊 Notability Score: ${author.notability_score}\n`;
    message += `📄 Total Papers: ${author.paper_count}\n`;
    message += `⭐ Featured Papers: ${author.featured_paper_count}\n`;

    if (author.affiliations && author.affiliations.length > 0) {
      message += `🏛️ Affiliations: ${author.affiliations.join(', ')}\n`;
    }

    if (author.research_areas && author.research_areas.length > 0) {
      message += `🔬 Areas: ${author.research_areas.slice(0, 3).join(', ')}\n`;
    }

    message += `\n📅 First seen: ${author.first_seen_date}\n`;
    message += `📅 Last paper: ${author.last_paper_date}`;

    if (featuredPapers.length > 0) {
      message += `\n\n✨ Recent Featured Papers:\n`;
      const recent = featuredPapers.slice(0, 3);
      for (const paper of recent) {
        message += `\n• ${paper.title.slice(0, 60)}...`;
      }
    }

    if (!exactMatch && authors.length > 1) {
      message += `\n\n💡 Did you mean one of these?\n`;
      authors.slice(0, 3).forEach((a) => {
        message += `• ${a.name}\n`;
      });
    }

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to search authors:', error);
    await sendSmsResponse(
      from,
      '❌ Author search failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleTopAuthors(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const topAuthors = await db.getTopAuthors(10);

    if (topAuthors.length === 0) {
      await sendSmsResponse(
        from,
        'No author data available yet. Check back after the first daily report runs.',
        twilioClient
      );
      await updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    let message = '🏆 Top AI Researchers (by notability)\n\n';

    topAuthors.slice(0, 10).forEach((author, index) => {
      message += `${index + 1}. ${author.name}\n`;
      message += `   Score: ${author.notability_score} | Papers: ${author.paper_count} | Featured: ${author.featured_paper_count}\n`;

      if (index < 9) {
        message += '\n';
      }
    });

    message += '\n💡 Text ARXIV AUTHOR <name> for details';

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to get top authors:', error);
    await sendSmsResponse(
      from,
      '❌ Failed to load top authors. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleStats(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const latest = await db.getLatestDailyReport();

    if (!latest) {
      await sendSmsResponse(
        from,
        'No statistics available yet. Check back after the first daily report runs.',
        twilioClient
      );
      await updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    const topAuthors = await db.getTopAuthors(1);
    const topAuthor = topAuthors[0];

    let message = '📊 arXiv Agent Statistics\n\n';
    message += `📅 Latest Report: ${latest.report_date}\n`;
    message += `📄 Papers Fetched: ${latest.total_papers_fetched}\n`;
    message += `⭐ Featured: ${latest.featured_papers_count}\n`;
    message += `👥 Notable Authors: ${latest.notable_authors_count || 0}\n`;
    message += `⏱️ Generation Time: ${latest.generation_duration_seconds || 0}s\n`;

    if (topAuthor) {
      message += `\n🏆 Top Author: ${topAuthor.name}\n`;
      message += `   Score: ${topAuthor.notability_score}`;
    }

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to get stats:', error);
    await sendSmsResponse(
      from,
      '❌ Failed to load statistics. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const helpMessage = `📚 ARXIV-RESEARCH Commands (Deprecated)

⚠️ NOTE: Use "ARXIV" commands instead for the latest graph-backed reports!

ARXIV-RESEARCH or ARXIV-RESEARCH REPORT
  Get today's curated AI research papers

ARXIV-RESEARCH SUBSCRIBE
  Get daily digest at 6 AM PT

ARXIV-RESEARCH UNSUBSCRIBE
  Stop daily digest

ARXIV-RESEARCH AUTHOR <name>
  Search for author and see their papers

ARXIV-RESEARCH TOP AUTHORS
  See top 10 researchers by notability

ARXIV-RESEARCH STATS
  Database statistics

💡 Recommended: Use "ARXIV" or "ARXIV HELP" for the improved graph-backed agent`;

  await sendSmsResponse(from, helpMessage, twilioClient);
  await updateLastMessageDate(context.normalizedFrom);

  return true;
}

// ============================================================================
// Main Command Handler
// ============================================================================

export const arxivCommandHandler: CommandHandler = {
  name: 'arxiv',
  matches(context: CommandContext): boolean {
    const upper = context.messageUpper;
    // DEPRECATED: Only handle explicit "ARXIV-RESEARCH" commands
    // "ARXIV" now routes to the graph-backed agent (arxiv-graph.ts)
    return upper.startsWith('ARXIV-RESEARCH');
  },
  async handle(context: CommandContext): Promise<boolean> {
    const messageUpper = context.message.trim().toUpperCase();
    const { subcommand, args } = parseArxivCommand(messageUpper);

    switch (subcommand) {
      case 'REPORT':
        return handleReport(context);

      case 'RUN':
        return handleRun(context);

      case 'SUBSCRIBE':
        return handleSubscribe(context);

      case 'UNSUBSCRIBE':
      case 'STOP':
        return handleUnsubscribe(context);

      case 'AUTHOR':
        return handleAuthorSearch(context, args);

      case 'TOP':
        // Support both "ARXIV TOP AUTHORS" and "ARXIV TOP"
        if (args.length > 0 && args[0] === 'AUTHORS') {
          return handleTopAuthors(context);
        }
        return handleTopAuthors(context);

      case 'AUTHORS':
        // Support "ARXIV AUTHORS" as alias for "ARXIV TOP AUTHORS"
        return handleTopAuthors(context);

      case 'STATS':
        return handleStats(context);

      case 'HELP':
        return handleHelp(context);

      default:
        // Unknown subcommand, show help
        return handleHelp(context);
    }
  },
};

export default arxivCommandHandler;
