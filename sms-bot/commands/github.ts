import { handleGitHubTrending, handleGitHubRepo, handleGitHubSearch, handleGitHubCommand } from "../agents/github-insights/agent.js";
import { CommandContext, CommandHandler } from "./types.js";

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
      
      // Handle GIVE TRENDING format
      if (messageUpper.startsWith("GIVE TRENDING")) {
        const topic = message.substring(13).trim();
        result = await handleGitHubTrending(topic);
      }
      // Handle simple TRENDING
      else if (messageUpper === "TRENDING") {
        result = await handleGitHubTrending();
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
          result = "Ì≥ò GitHub Commands:\n‚Ä¢ gh trending [topic]\n‚Ä¢ gh repo owner/repo\n‚Ä¢ gh search <query>";
        }
      }
      // Default help
      else {
        result = "Ì≥ò GitHub Commands:\n‚Ä¢ gh trending [topic]\n‚Ä¢ gh repo owner/repo\n‚Ä¢ gh search <query>";
      }
      
      await sendSmsResponse(from, result, twilioClient);
    } catch (error) {
      console.error("GitHub command failed:", error);
      await sendSmsResponse(from, "‚ùå GitHub command failed. Please try again.", twilioClient);
    }
    
    return true;
  },
};
