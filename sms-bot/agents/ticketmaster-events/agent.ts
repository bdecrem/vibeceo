import {
  query,
  tool,
  createSdkMcpServer,
  Options,
} from "@anthropic-ai/claude-agent-sdk";

import { z } from "zod";
import fetch from "node-fetch";

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

export async function fetchEvents(city: string, keyword?: string) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const ticketmasterQueryUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&city=${encodeURIComponent(
    city
  )}&keyword=${encodeURIComponent(
    keyword ? keyword : ""
  )}&size=5&page=1&sort=date,asc&startDateTime=${now}`;

  const response = await fetch(ticketmasterQueryUrl);
  const data = await response.json();

  if (!data["_embedded"]["events"]) {
    return "No events found in the given city.";
  }

  const eventList: string[] = [];

  for (const event of data["_embedded"]["events"]) {
    eventList.push(event["name"]);
    eventList.push(JSON.stringify(event["dates"]));
    eventList.push(JSON.stringify(event["place"]));
  }

  return eventList.join(", ");
}

export const eventMcpServer = createSdkMcpServer({
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
  model: "claude-3-5-haiku-latest",
  mcpServers: { event_mcp_tool: eventMcpServer },
  allowedTools: ["Read", "Write", "mcp__event_mcp_tool__fetch_events"],
  systemPrompt: `
    You are an assistant that finds events in a city. The keyword is optional.
    You MUST ALWAYS call fetch_events tool when asked to find events.
    Do NOT include a keyword if the user does not input one.
    If no city is given, prompt the user for one.
    Return the events with the name, date, time, place. If a value is missing, you can skip it. Do not include the status.
    Keep your responses brief and short. If there are no events, simply say so.
  `,
};

export async function handleEventSearch(chatMessage: string) {
  for await (const message of query({
    prompt: chatMessage,
    options: agentOptions,
  })) {
    if (message.type === "result" && message.subtype === "success") {
      return message.result;
    }
  }
}
