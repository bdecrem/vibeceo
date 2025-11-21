import { 
  handleGitHubTrending, 
  handleGitHubRepo, 
  handleGitHubSearch,
  runAndStoreGitHubInsights,
  getLatestStoredGitHubInsights
} from "../agents/github-insights/index.js";
import { 
  subscribeToAgent, 
  unsubscribeFromAgent, 
  isSubscribedToAgent 
} from "../lib/agent-subscriptions.js";
import { getSubscriber } from "../lib/subscribers.js";
import { CommandContext, CommandHandler } from "./types.js";

const AGENT_SLUG = 'github-insights';

export const githubCommandHandler: CommandHandler = {
  name: "github",
  matches(context) {
    const msg = context.messageUpper;
    
    return (
      msg.startsWith("GH ") ||
      msg === "GH" ||
      msg.startsWith("GITHUB ") ||
      msg === "GITHUB" ||
      msg.startsWith("GIVE TRENDING") ||
      msg === "TRENDING"
    );
  },
  
  async handle(context) {
    const { from, twilioClient, sendSmsResponse, message, messageUpper } = context;
    
    try {
      let result: string;
      
      // Handle subscription commands
      if (messageUpper === "GH SUBSCRIBE" || messageUpper === "GITHUB SUBSCRIBE") {
        const subscriber = await getSubscriber(from);
        if (subscriber) {
          await subscribeToAgent(subscriber.id, AGENT_SLUG);
          result = "‚úÖ Subscribed to GitHub Insights daily digest! You'll receive trending repos each morning.";
        } else {
          result = "‚ùå Unable to subscribe. Please text START first to register.";
        }
      }
      else if (messageUpper === "GH UNSUBSCRIBE" || messageUpper === "GITHUB UNSUBSCRIBE") {
        const subscriber = await getSubscriber(from);
        if (subscriber) {
          await unsubscribeFromAgent(subscriber.id, AGENT_SLUG);
          result = "‚úÖ Unsubscribed from GitHub Insights daily digest.";
        } else {
          result = "‚ùå Unable to unsubscribe.";
        }
      }
      // Handle report generation (admin only)
      else if (messageUpper === "GH RUN" && from === "+16508989508") {
        result = "Ì¥Ñ Generating GitHub Insights report...";
        await sendSmsResponse(from, result, twilioClient);
        
        const report = await runAndStoreGitHubInsights();
        result = `‚úÖ Report generated!\n\n${report.summary}`;
      }
      // Handle GIVE TRENDING format
      else if (messageUpper.startsWith("GIVE TRENDING")) {
        const topic = message.substring(13).trim();
        result = await handleGitHubTrending(topic);
      }
      // Handle simple TRENDING
      else if (messageUpper === "TRENDING") {
        result = await handleGitHubTrending();
      }
      // Handle GH HELP
      else if (messageUpper === "GH HELP" || messageUpper === "GITHUB HELP") {
        result = `Ì≥ò GitHub Commands:
- gh trending [topic] - Top repos
- gh repo owner/repo - Repo details  
- gh search <query> - Search repos
- gh subscribe - Daily digest
- gh unsubscribe - Stop digest`;
      }
      // Handle GH/GITHUB commands
      else if (messageUpper.startsWith("GH ") || messageUpper.startsWith("GITHUB ")) {
        const prefix = messageUpper.startsWith("GH ") ? 3 : 7;
        const command = message.substring(prefix).trim();
        
        // Parse subcommand
        const parts = command.split(/\s+/);
        const subCommand = parts[0]?.toLowerCase();
        
        if (subCommand === 'trending') {
          const topic = parts.slice(1).join(' ');
          result = await handleGitHubTrending(topic);
        } else if (subCommand === 'repo' && parts[1]) {
          result = await handleGitHubRepo(parts[1]);
        } else if (subCommand === 'search' && parts.length > 1) {
          const query = parts.slice(1).join(' ');
          result = await handleGitHubSearch(query);
        } else {
          result = "Try: gh trending, gh repo owner/repo, gh search <query>";
        }
      }
      // Default trending
      else {
        result = await handleGitHubTrending();
      }
      
      await sendSmsResponse(from, result, twilioClient);
    } catch (error) {
      console.error("GitHub command failed:", error);
      await sendSmsResponse(from, "‚ùå GitHub command failed. Please try again.", twilioClient);
    }
    
    return true;
  },
};
