import { handleContextualNewsSearch } from "../agents/contextual-news/agent.js";
import { CommandContext, CommandHandler } from "./types.js";
import { matchesPrefix } from "./command-utils.js";

// PREFIX for command
const NEWS_PREFIX = "NEWS";

export const contextualNewsCommandHandler: CommandHandler = {
  name: "contextualnews",

  matches(context) {
    return matchesPrefix(context.messageUpper, NEWS_PREFIX);
  },

  async handle(context) {
    const { from, twilioClient, sendSmsResponse } = context;
    const messageBody = (context as any).messageBody ?? "";

    // Extract topic after the prefix
    const topic = messageBody.replace(/NEWS/i, "").trim() || "technology";

    try {
      const summary = await handleContextualNewsSearch(topic);

      await sendSmsResponse(from, summary, twilioClient);
    } catch (err) {
      console.error("[Contextual News] Error:", err);
      await sendSmsResponse(
        from,
        "Could not fetch news.",
        twilioClient
      );
    }

    return true;
  },
};
