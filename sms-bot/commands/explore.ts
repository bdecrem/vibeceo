import { getExploreStatePath, runExploreAgent } from "../agents/explore/index.js";
import type { ExploreAgentFailure } from "../agents/explore/index.js";
import { readFile } from "node:fs/promises";
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

  if (errorText.includes("ENOENT")) {
    return "Explore agent could not find Python. Install Python 3.11+ or set EXPLORE_AGENT_PYTHON_BIN to your python command.";
  }

  if (errorText) {
    return `Explore agent failed: ${errorText}`;
  }

  return "Explore agent failed unexpectedly. Try again soon.";
}

const KNOWN_MODES = new Set(["FOOD", "OUTDOORS", "HIDDEN", "DATE"]);

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractCityHint(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed.toUpperCase().startsWith("EXPLORE")) {
    return null;
  }

  const rest = trimmed.slice("explore".length).trim();
  if (!rest) {
    return null;
  }

  const tokens = rest.split(/\s+/);
  let index = 0;

  if (tokens[index] && KNOWN_MODES.has(tokens[index].toUpperCase())) {
    index += 1;
  }

  const cityTokens: string[] = [];

  for (; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.includes("=")) {
      break;
    }
    cityTokens.push(token);
  }

  if (cityTokens.length === 0) {
    return null;
  }

  let city = cityTokens.join(" ").trim();
  city = city.replace(/^"+|"+$/g, "");
  city = city.replace(/^'+|'+$/g, "");

  if (!city) {
    return null;
  }

  return titleCase(city);
}

async function loadLastCity(statePath: string): Promise<string | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && typeof data.last_city === "string") {
      const city = data.last_city.trim();
      if (city) {
        return titleCase(city);
      }
    }
  } catch (error) {
    // Ignore missing state
  }
  return null;
}


function normalizeStatus(text: string): string {
  return text.trim().replace(/"/g, "").replace(/\s+/g, " ").toLowerCase();
}

async function buildStatusLine(command: string, statePath: string): Promise<string | null> {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();

  if (upper.startsWith("EXPLORE")) {
    const city = extractCityHint(trimmed);
    if (city) {
      return `Exploring ${city}...`;
    }
    return "Exploring...";
  }

  if (upper.startsWith("REFINE")) {
    const city = await loadLastCity(statePath);
    if (city) {
      return `Exploring ${city}...`;
    }
    return "Exploring...";
  }

  return null;
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
    const statusLine = await buildStatusLine(commandText, statePath);

    if (statusLine) {
      await sendSmsResponse(from, statusLine, twilioClient);
    }

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

      let messageToDeliver = result.message;

      if (statusLine) {
        const normalizedStatus = normalizeStatus(statusLine);
        const lines = messageToDeliver.split(/\r?\n/);
        if (lines.length > 0 && normalizeStatus(lines[0]) === normalizedStatus) {
          messageToDeliver = lines.slice(1).join("\n");
        }
      }

      if (messageToDeliver.trim()) {
        await sendChunkedSmsResponse(from, messageToDeliver, twilioClient, 700);
      } else {
        await sendSmsResponse(from, "Explore agent finished but returned an empty response.", twilioClient);
      }
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




