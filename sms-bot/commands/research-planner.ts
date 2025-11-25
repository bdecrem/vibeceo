import { runResearchPlannerAgent } from '../agents/research-planner/index.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, extractAfterPrefix } from './command-utils.js';

const STUDY_PREFIX = 'STUDY';

function parseStudyCommand(message: string, messageUpper: string): { subcommand: string; researchQuestion?: string } {
  const normalized = messageUpper.trim();

  // Just "STUDY" or "STUDY HELP"
  if (normalized === STUDY_PREFIX || normalized === `${STUDY_PREFIX} HELP`) {
    return { subcommand: 'HELP' };
  }

  // Extract research question after "STUDY"
  const question = extractAfterPrefix(message, messageUpper, STUDY_PREFIX).trim();

  if (!question || question.length === 0) {
    return { subcommand: 'HELP' };
  }

  return { subcommand: 'GENERATE', researchQuestion: question };
}

async function handleGenerate(context: CommandContext, researchQuestion: string): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  // Send initial acknowledgment
  await sendSmsResponse(
    from,
    '📊 Generating your study plan. This may take 30-60 seconds...',
    twilioClient
  );

  try {
    console.log(`[Research Planner] Generating plan for: "${researchQuestion}"`);
    const { summary, shortLink } = await runResearchPlannerAgent(researchQuestion, normalizedFrom);

    console.log(`[Research Planner] Got plan summary (${summary.length} chars)`);

    // Build SMS message with summary and link
    let message = `📚 Study Plan Ready\n\n${summary}`;
    if (shortLink) {
      message += `\n\n📄 Full plan: ${shortLink}`;
    }

    // Send the summary with link
    await sendSmsResponse(from, message, twilioClient);

  } catch (error: any) {
    console.error('[Research Planner] Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('missing_claude_agent_sdk') || errorMessage.includes('claude_agent_sdk')) {
      await sendSmsResponse(
        from,
        '⚠️ Research planner needs setup: run `pip install claude-agent-sdk` and set ANTHROPIC_API_KEY on the server.',
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        '❌ Sorry, I had trouble generating your study plan. Please try again or rephrase your research question.',
        twilioClient
      );
    }
  } finally {
    // Silently update last message date (don't let Supabase errors propagate)
    try {
      await updateLastMessageDate(context.normalizedFrom);
    } catch (error) {
      // Silently ignore - this is just tracking, not critical
      console.warn('[Research Planner] Failed to update last message date (non-critical):', error);
    }
  }

  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  await sendSmsResponse(
    from,
    '📚 STUDY PLANNER\n\nGenerate comprehensive study plans for research ideas.\n\nCommands:\n• STUDY {research question} - Generate a study plan\n• STUDY HELP - Show this message\n\nExample:\nSTUDY How does sleep affect memory consolidation in adults?',
    twilioClient
  );

  // Silently update last message date (don't let Supabase errors propagate)
  try {
    await updateLastMessageDate(context.normalizedFrom);
  } catch (error) {
    // Silently ignore - this is just tracking, not critical
    console.warn('[Research Planner] Failed to update last message date (non-critical):', error);
  }
  return true;
}

export const researchPlannerCommandHandler: CommandHandler = {
  name: 'research-planner',
  matches(context) {
    return matchesPrefix(context.messageUpper, STUDY_PREFIX);
  },
  async handle(context) {
    const { subcommand, researchQuestion } = parseStudyCommand(context.message, context.messageUpper);

    switch (subcommand) {
      case 'HELP':
        return handleHelp(context);
      case 'GENERATE':
        if (!researchQuestion) {
          return handleHelp(context);
        }
        return handleGenerate(context, researchQuestion);
      default:
        return handleHelp(context);
    }
  },
};

