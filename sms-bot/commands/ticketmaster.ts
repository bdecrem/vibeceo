import { CommandContext, CommandHandler } from "./types.js";

const TICKETMASTER_PREFIX = "EVENTS";

async function handleEventSearch(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } =
    context;
  return true;
}

export const ticketmasterCommandHandler: CommandHandler = {
  name: "ticketmaster",
  matches(context) {
    return context.messageUpper.startsWith(TICKETMASTER_PREFIX);
  },
  async handle(context) {
    if (context.messageUpper.startsWith(TICKETMASTER_PREFIX)) {
      return handleEventSearch(context);
    }
  },
};
