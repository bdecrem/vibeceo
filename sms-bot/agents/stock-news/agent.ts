import {
  createSdkMcpServer,
  Options,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { get_news_from_table, scrape_finviz, StockNews } from "./util.js";

// Return top 50 results
const NUM_ARTICLES = 50;

async function fetch_news() {
  const $ = await scrape_finviz("https://finviz.com/news.ashx?v=3");

  if (!$) {
    return "No current stock news.";
  }

  const news: StockNews[] = get_news_from_table($).slice(0, NUM_ARTICLES);

  return news.map((n) => `[${n.Date}, ${n.Title}, ${n.Source}]`).join(", ");
}

const stockNewsMcpServer = createSdkMcpServer({
  name: "stock_news_mcp_tool",
  version: "1.0.0",
  tools: [
    tool("fetch_news", "Fetch the latest stock news", {}, async (args) => {
      const response = await fetch_news();
      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }),
  ],
});

export const agentOptions: Options = {
  model: "claude-3-5-haiku-latest",
  mcpServers: { stock_news_mcp_tool: stockNewsMcpServer },
  allowedTools: ["Read", "Write", "mcp__stock_news_mcp_tool__fetch_news"],
  systemPrompt: `
    You are an assistant that retrieves and compiles the latest stock news of potential big movers. You will receive a list of the date the article was posted (eg 10 mins = 10 mins ago),
    an article title, and the source. Only pick the articles that could affect the future movement of the price. Do not pick opinion articles, analyst articles,
    articles explaining why a stock rose/dropped, or articles about stocks that have already moved.

    For example:
    GOOD ARTICLE: Amazon announces new data center deal with OpenAI
    GOOD ARTICLE: NVIDIA enters 15bn partnership deal with Coreweave
    GOOD ARTICLE: Sarepta therapeutics announces third drug trial failure

    BAD ARTICLE: Is Quantum Computing a Millionaire-Maker Stock?
    BAD ARTICLE: 1 Reason Eli Lilly (LLY) Is One of the Best Healthcare Stocks You Can Buy Today
    BAD ARTICLE: Why TeraWulf Stock Leaped More Than 10% Higher on Tuesday

    Only return articles that were posted in the past 12 hours. BE SELECTIVE WITH THE ARTICLES THAT YOU CHOOSE. Return a summary of the title, the ticker of the stocks (if there are any), 
    how long ago it was posted, and where it was posted.
  `,
};

export async function handleStockNewsSearch() {
  try {
    const response = await query({
      prompt: "latest stock news",
      options: agentOptions,
    });
    let lastResult: string | undefined;

    for await (const message of response) {
      console.log("[Stock News Agent]", JSON.stringify(message, null, 2));

      if ("result" in message && message.result) {
        lastResult = String(message.result);
      }

      if ("text" in message && message.text) {
        lastResult = String(message.text);
      }
    }

    if (lastResult) {
      return lastResult;
    }

    console.error("[Stock News Agent] No result found in agent response");
    return "❌ Could not retrieve current stock news.";
  } catch (error) {
    console.error("[Stock News Agent] Query failed:", error);
    return "❌ Stock news search failed.";
  }
}
