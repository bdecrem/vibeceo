import {
  handleGitHubTrending,
  handleGitHubRepo,
  handleGitHubSearch,
  runAndStoreGitHubInsights,
  getLatestStoredGitHubInsights,
} from "../agents/github-insights/index.js";
import {
  subscribeToAgent,
  unsubscribeFromAgent,
  isSubscribedToAgent,
} from "../lib/agent-subscriptions.js";
import { getSubscriber } from "../lib/subscribers.js";
import { CommandContext, CommandHandler } from "./types.js";

const AGENT_SLUG = "github-insights";

export const githubCommandHandler: CommandHandler = {
  name: "github",
  matches(context) {
    const msg = context.messageUpper;

    return (
      msg.startsWith("TRENDING") ||
      msg === "TRENDING" ||
      msg.startsWith("REPOS ") ||
      msg === "REPOS" ||
      msg.startsWith("REPO ") ||
      msg.startsWith("SEARCH REPOS") ||
      msg.startsWith("FIND REPOS") ||
      msg.includes("WHAT'S TRENDING") ||
      msg.includes("WHATS TRENDING") ||
      // Keep these for backward compatibility temporarily
      msg.startsWith("GITHUB ") ||
      msg === "GITHUB"
    );
  },

  async handle(context) {
    const { from, twilioClient, sendSmsResponse, message, messageUpper } =
      context;

    try {
      let result: string;

      // Handle subscription commands
      if (
        messageUpper === "TRENDING SUBSCRIBE" ||
        messageUpper === "GITHUB SUBSCRIBE"
      ) {
        const subscriber = await getSubscriber(from);
        if (subscriber) {
          await subscribeToAgent(subscriber.id, AGENT_SLUG);
          result =
            "✅ Subscribed to GitHub Insights daily digest! You'll receive trending repos each morning.";
        } else {
          result =
            "❌ Unable to subscribe. Please text START first to register.";
        }
      } else if (
        messageUpper === "TRENDING UNSUBSCRIBE" ||
        messageUpper === "GITHUB UNSUBSCRIBE"
      ) {
        const subscriber = await getSubscriber(from);
        if (subscriber) {
          await unsubscribeFromAgent(subscriber.id, AGENT_SLUG);
          result = "✅ Unsubscribed from GitHub Insights daily digest.";
        } else {
          result = "❌ Unable to unsubscribe.";
        }
      }
      // Handle admin report generation
      else if (messageUpper === "TRENDING RUN" && from === "+16508989508") {
        result = "🔄 Generating GitHub Insights report...";
        await sendSmsResponse(from, result, twilioClient);

        const report = await runAndStoreGitHubInsights();
        result = `✅ Report generated!\n\n${report.summary}`;
      }
      // Handle TRENDING with topics
      else if (messageUpper.startsWith("TRENDING")) {
        const topic = message.substring(8).trim();
        result = await handleGitHubTrending(topic || undefined);
      }
      // Handle REPO/REPOS commands
      else if (messageUpper.startsWith("REPO ")) {
        const repoInput = message.substring(5).trim();
        if (repoInput) {
          result = await handleGitHubRepo(repoInput);
        } else {
          result =
            "Please specify repo as: repo owner/name or paste GitHub URL";
        }
      } else if (messageUpper.startsWith("REPOS ")) {
        const repoInput = message.substring(6).trim();
        if (repoInput) {
          result = await handleGitHubRepo(repoInput);
        } else {
          result =
            "Please specify repo as: repos owner/name or paste GitHub URL";
        }
      }
      // Handle SEARCH commands
      else if (messageUpper.startsWith("SEARCH REPOS ")) {
        const query = message.substring(13).trim();
        result = await handleGitHubSearch(query);
      } else if (messageUpper.startsWith("FIND REPOS ")) {
        const query = message.substring(11).trim();
        result = await handleGitHubSearch(query);
      }
      // Handle natural language
      else if (
        messageUpper.includes("WHAT'S TRENDING") ||
        messageUpper.includes("WHATS TRENDING")
      ) {
        const afterTrending = message
          .toLowerCase()
          .split("trending")[1]
          ?.trim();
        result = await handleGitHubTrending(afterTrending);
      }
      // Help commands
      else if (
        messageUpper === "REPOS HELP" ||
        messageUpper === "TRENDING HELP" ||
        messageUpper === "REPOS"
      ) {
        result = `📱 Commands:
- trending - Today's hot repos
- trending [any topic] - Trending in any area  
- repos owner/name - Repository details
- search repos [anything] - Find repos
- trending subscribe - Daily digest
- trending unsubscribe - Stop digest`;
      }
      // Legacy GitHub commands (keep for backward compatibility)
      else if (messageUpper.startsWith("GITHUB ")) {
        const command = message.substring(7).trim();
        const parts = command.split(/\s+/);
        const subCommand = parts[0]?.toLowerCase();

        if (subCommand === "trending") {
          const topic = parts.slice(1).join(" ");
          result = await handleGitHubTrending(topic);
        } else if (subCommand === "repo" && parts[1]) {
          result = await handleGitHubRepo(parts[1]);
        } else if (subCommand === "search" && parts.length > 1) {
          const query = parts.slice(1).join(" ");
          result = await handleGitHubSearch(query);
        } else {
          result = "Try: trending, repos owner/name, search repos <query>";
        }
      } else if (messageUpper === "GITHUB") {
        result = await handleGitHubTrending();
      }
      // Default: show trending
      else {
        result = await handleGitHubTrending();
      }

      await sendSmsResponse(from, result, twilioClient);
    } catch (error) {
      console.error("GitHub command failed:", error);
      await sendSmsResponse(
        from,
        "❌ Command failed. Try: trending, repos owner/name",
        twilioClient
      );
    }

    return true;
  },
};
