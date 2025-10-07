import { handleEventSearch } from "../agents/ticketmaster-events/agent.js";
import { CommandContext, CommandHandler } from "./types.js";

const TICKETMASTER_PREFIX = "EVENTS";

async function handleSearch(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse } = context;
  try {
    // Extract query after "EVENTS" prefix
    const query = context.message.replace(/^EVENTS\s*/i, '').trim();

    if (!query) {
      await sendSmsResponse(
        from,
        "Usage: EVENTS [city] [optional: keyword]\n\nExamples:\n• EVENTS Oakland\n• EVENTS San Francisco concert\n• EVENTS New York jazz",
        twilioClient
      );
      return true;
    }

    console.log(`[Ticketmaster] Searching for: "${query}"`);

    // Send immediate acknowledgment
    await sendSmsResponse(
      from,
      "🎫 Searching for events...",
      twilioClient
    );

    const message = await handleEventSearch(query);

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to fetch Ticketmaster events:", error);
    await sendSmsResponse(
      from,
      "❌ Could not fetch Ticketmaster events. Please try again.",
      twilioClient
    );
  }
  return true;
}

export const ticketmasterCommandHandler: CommandHandler = {
  name: "ticketmaster",
  matches(context) {
    return context.messageUpper.startsWith(TICKETMASTER_PREFIX);
  },
  async handle(context) {
    if (context.messageUpper.startsWith(TICKETMASTER_PREFIX)) {
      return handleSearch(context);
    }
  },
};
