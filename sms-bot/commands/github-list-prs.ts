// sms-bot/commands/github-list-prs.ts

import { handleGithubPullRequestSummary } from "../agents/github/agent.js";
import { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix } from "./command-utils.js";

// Prefix definition – what the user will type first in SMS
// e.g. "GITHUB BDECREM VIBECEO"
const GITHUB_PREFIX = "GITHUB";

async function handleSearch(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, messageUpper } = context;

  try {
    console.log(`[GitHub] Summarizing pull requests..."`);

    // messageUpper example: "GITHUB BDECREM VIBECEO"
    const parts = messageUpper.trim().split(/\s+/);
    const owner = parts[1]?.toLowerCase();
    const repo = parts[2]?.toLowerCase();

    if (!owner || !repo) {
      await sendSmsResponse(
        from,
        "Usage: GITHUB <OWNER> <REPO>\nExample: GITHUB BDECREM VIBECEO",
        twilioClient
      );
      return true;
    }

    // Call GitHub agent function (we'll implement this in agents/github/agent.ts)
    const message = await handleGithubPullRequestSummary({ owner, repo });

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to summarize GitHub PRs:", error);
    await sendSmsResponse(
      from,
      "❌ Could not fetch GitHub pull requests. Please try again.",
      twilioClient
    );
  }

  return true;
}

export const githubCommandHandler: CommandHandler = {
  name: "github",
  matches(context) {
    // Handle "GITHUB", "GITHUB,", "github!", etc.
    return matchesPrefix(context.messageUpper, GITHUB_PREFIX);
  },
  async handle(context) {
    if (matchesPrefix(context.messageUpper, GITHUB_PREFIX)) {
      return handleSearch(context);
    }
  },
};
