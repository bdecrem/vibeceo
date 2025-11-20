import {
  createSdkMcpServer,
  Options,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { fetchArticles } from "./util.js";



// MCP Tool: Fetch articles
const contextualNewsMcpServer = createSdkMcpServer({
  name: "contextual_news_mcp_tool",
  version: "1.0.0",
  tools: [
    tool(
      "fetch_contextual_news",
      "Fetch recent news articles about a given topic",
      {}, // ✅ no schema, same pattern as stock-news
      async (args: any) => {
        const topic =
          (args && (args.topic as string)) ||
          (typeof args === "string" ? args : "") ||
          "technology";

        const articles = await fetchArticles(topic);

        if (!articles || articles.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No recent articles found for "${topic}".`,
              },
            ],
          };
        }

        const formatted = articles
          .map((a: any, index: number) => {
            const date = a.publishedAt
              ? new Date(a.publishedAt).toLocaleString()
              : "Unknown date";
            const source = a.source || "Unknown source";

            return `${index + 1}. ${a.title}\n   ${source} · ${date}\n   ${
              a.url
            }`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: formatted,
            },
          ],
        };
      }
    ),
  ],
});




// Claude Agent Options
export const agentOptions: Options = {
  model: "claude-haiku-4-5",
  mcpServers: { contextual_news_mcp_tool: contextualNewsMcpServer },
  allowedTools: [
    "Read",
    "Write",
    "mcp__contextual_news_mcp_tool__fetch_contextual_news",
  ],
  systemPrompt: `
    You are a concise news summarizer.
    You will receive a list of recent articles about a topic.

    You must:
    - Summarize the news in 3–5 bullet points
    - Only include important, factual updates
    - Make it SMS-friendly
    - Ignore sponsored content or opinion pieces
  `,
};

// Main handler called from the SMS command
export async function handleContextualNewsSearch(topic: string) {
  try {
    const response = await query({
      prompt: `Fetch and summarize news about: ${topic}`,
      options: agentOptions,
    });

    let lastResult: string | undefined;

    for await (const message of response) {
      console.log("[Contextual News Agent]", JSON.stringify(message, null, 2));

      if ("result" in message && message.result) {
        lastResult = String(message.result);
      }
      if ("text" in message && message.text) {
        lastResult = String(message.text);
      }
    }

    return lastResult || `No news found for topic: ${topic}`;
  } catch (err) {
    console.error("[Contextual News Agent] Error:", err);
    return "❌ Could not fetch contextual news.";
  }
}
