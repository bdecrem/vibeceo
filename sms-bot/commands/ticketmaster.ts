import { handleEventSearch } from "../agents/ticketmaster-events/agent.js";
import { CommandContext, CommandHandler } from "./types.js";

const TICKETMASTER_PREFIX = "EVENTS";

async function handleSearch(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;
  try {
    const message = await handleEventSearch(context.message);

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to fetch Ticketmaster events:", error);
    await sendSmsResponse(
      from,
      "❌ Could not fetch Ticketmaster events. Please try again.",
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }
  return true;
}

export const ticketmasterCommandHandler: CommandHandler = {
  name: "ticketmaster",
  matches(context) {
    return context.messageUpper.startsWith(TICKETMASTER_PREFIX);
  },
  async handle(context) {
    return handleSearch(context);
  },
};
