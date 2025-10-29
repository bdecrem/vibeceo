import {
  query,
  tool,
  createSdkMcpServer,
  Options,
} from "@anthropic-ai/claude-agent-sdk";

import { z } from "zod";
import fetch from "node-fetch";

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

async function fetchEvents(city: string, keyword?: string) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const ticketmasterQueryUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&city=${encodeURIComponent(
    city
  )}&keyword=${encodeURIComponent(
    keyword ? keyword : ""
  )}&size=3&page=1&sort=date,asc&startDateTime=${now}`;

  const response = await fetch(ticketmasterQueryUrl);
  const data = await response.json();

  if (!data["_embedded"]) {
    return "No events found in the given city.";
  }

  const eventList: string[] = [];

  for (const event of data["_embedded"]["events"]) {
    eventList.push(event["name"]);
    eventList.push(JSON.stringify(event["dates"]));
    eventList.push(JSON.stringify(event["place"]));
    eventList.push(event["info"]);
  }

  return eventList.join(", ");
}

const eventMcpServer = createSdkMcpServer({
  name: "event_mcp_tool",
  version: "1.0.0",
  tools: [
    tool(
      "fetch_events",
      "Find events that are happening in a city",
      {
        city: z.string().describe("Location or city name"),
        keyword: z.string().optional().describe("Keyword of event type"),
      },
      async (args) => {
        const response = await fetchEvents(args.city, args.keyword);
        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      }
    ),
  ],
});

export const agentOptions: Options = {
  model: "claude-haiku-4-5",
  mcpServers: { event_mcp_tool: eventMcpServer },
  allowedTools: ["Read", "Write", "mcp__event_mcp_tool__fetch_events"],
  systemPrompt: `
    You are an assistant that finds events in a city. The keyword is optional. Do NOT include a keyword if the user does not input one.
    If no city is given, prompt the user for one.
    Return the events with the name, date, time, place, and description. If a field is missing, do not include it. Do not include the status.
    Keep your responses very short and brief. Do not ask the user follow up questions.
  `,
};

export async function handleEventSearch(chatMessage: string) {
  if (!TICKETMASTER_API_KEY) {
    return "❌ Ticketmaster API key not configured. Please contact support.";
  }

  try {
    const response = await query({
      prompt: chatMessage,
      options: agentOptions,
    });
    let lastResult: string | undefined;

    for await (const message of response) {
      console.log("[Ticketmaster Agent]", JSON.stringify(message, null, 2));

      // Check for result property
      if ("result" in message && message.result) {
        lastResult = String(message.result);
      }

      // Also check for text/content in other message types
      if ("text" in message && message.text) {
        lastResult = String(message.text);
      }
    }

    // Return the last result found, or a helpful error
    if (lastResult) {
      return lastResult;
    }

    console.error("[Ticketmaster Agent] No result found in agent response");
    return "❌ Could not find events. Please try with: EVENTS [city] [optional: keyword]\nExample: EVENTS Oakland\nExample: EVENTS San Francisco concert";
  } catch (error) {
    console.error("[Ticketmaster Agent] Query failed:", error);
    return "❌ Event search failed. Please try again with: EVENTS [city] [keyword]";
  }
}
