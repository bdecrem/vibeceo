import { getExploreStatePath, runExploreAgent } from "../agents/explore/index.js";
import type { ExploreAgentFailure } from "../agents/explore/index.js";
import type { CommandContext, CommandHandler } from "./types.js";

const EXPLORE_PREFIX = "EXPLORE";
const REFINE_PREFIX = "REFINE";

function shouldHandle(messageUpper: string): boolean {
  const normalized = messageUpper.trim();
  return (
    normalized.startsWith(EXPLORE_PREFIX) || normalized.startsWith(REFINE_PREFIX)
  );
}

function formatExploreError(result: ExploreAgentFailure): string {
  const errorText = result.error.trim();
  const stderr = (result.stderr || "").toLowerCase();

  if (stderr.includes("module not found") && stderr.includes("requests")) {
    return (
      'Explore agent needs the `requests` package. Activate the Python env and run `pip install requests`.'
    );
  }

  if (stderr.includes("invalid api key") || stderr.includes("api key not valid")) {
    return (
      'Explore agent could not reach Google Places. Double-check `GOOGLE_PLACES_API_KEY`.'
    );
  }

  if (errorText) {
    return `Explore agent failed: ${errorText}`;
  }

  return "Explore agent failed unexpectedly. Try again soon.";
}

export const exploreCommandHandler: CommandHandler = {
  name: "explore",
  matches(context) {
    return shouldHandle(context.messageUpper);
  },
  async handle(context) {
    const { from, twilioClient, sendChunkedSmsResponse, sendSmsResponse } = context;
    const commandText = context.message.trim();

    if (!commandText) {
      await sendSmsResponse(
        from,
        "Usage: explore <city> [filters]",
        twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }

    const statePath = getExploreStatePath(context.normalizedFrom);

    try {
      const result = await runExploreAgent(commandText, statePath);

      if (!result.ok) {
        const failure = result as ExploreAgentFailure;
        const errorMessage = formatExploreError(failure);
        console.error("Explore agent error:", {
          phone: context.normalizedFrom,
          error: failure.error,
          stderr: failure.stderr,
        });
        await sendSmsResponse(from, errorMessage, twilioClient);
        await context.updateLastMessageDate(context.normalizedFrom);
        return true;
      }

      await sendChunkedSmsResponse(from, result.message, twilioClient, 700);
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    } catch (error) {
      console.error("Explore command crashed:", error);
      await sendSmsResponse(
        from,
        "Explore agent crashed before finishing. Check server logs and retry.",
        twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
      return true;
    }
  },
};


