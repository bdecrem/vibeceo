import { handleStockNewsSearch } from "../agents/stock-news/agent.js";
import { CommandContext, CommandHandler } from "./types.js";

const STOCK_PREFIX = "STOCKNEWS";

async function handleSearch(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse } = context;
  try {
    console.log(`[Stock News] Searching for latest news..."`);

    const message = await handleStockNewsSearch();

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error("Failed to fetch stock news:", error);
    await sendSmsResponse(
      from,
      "❌ Could not fetch latest stock news. Please try again.",
      twilioClient
    );
  }
  return true;
}

export const stockNewsCommandHandler: CommandHandler = {
  name: "stocknews",
  matches(context) {
    return context.messageUpper.startsWith(STOCK_PREFIX);
  },
  async handle(context) {
    if (context.messageUpper.startsWith(STOCK_PREFIX)) {
      return handleSearch(context);
    }
  },
};
