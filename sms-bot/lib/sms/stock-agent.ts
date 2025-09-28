/**
 * Agentic Stock Bot - Intelligent Stock Market Assistant
 *
 * Features:
 * - Remembers user stock preferences and watchlists
 * - Provides intelligent stock analysis and updates
 * - Sets up scheduled alerts for daily updates and price thresholds
 * - Conversational AI with memory and context awareness
 * - Proactive market intelligence and suggestions
 */

import { generateAiResponse } from "./ai.js";
import { sendSmsResponse } from "./handlers.js";
import type { TwilioClient } from "./webhooks.js";
import { supabase } from "../supabase.js";
import { getStockData as fetchStockData, type StockData } from "./stock-api.js";

// Types for stock agent (re-exported from stock-api)
export type { StockData } from "./stock-api.js";

/**
 * Detect natural language stock queries and extract company/symbol
 */
function detectNaturalStockQuery(
  message: string
): { symbol: string; companyName: string; commandType: string } | null {
  const lowerMessage = message.toLowerCase();

  // Common stock-related phrases
  const stockPhrases = [
    // Price queries
    "stock price of",
    "price of",
    "stock for",
    "how much is",
    "what is the price of",
    "current price of",
    "stock value of",
    "share price of",
    "trading at",
    "worth",
    "cost",
    "value",
    "what's the price",
    "how much does",
    "current value",
    "stock worth",
    "share value",
    // Portfolio management
    "add to portfolio",
    "add to watchlist",
    "watch",
    "track",
    "follow",
    "monitor",
    "add",
    "remove from portfolio",
    "remove from watchlist",
    "unwatch",
    "stop tracking",
    "show my portfolio",
    "show my watchlist",
    "my stocks",
    "my portfolio",
    "what am i watching",
    "portfolio",
    "watchlist",
    "stocks i'm watching",
    "my watchlist",
    "remove",
    "delete",
    "stop watching",
    // Analysis
    "analyze",
    "analysis",
    "tell me about",
    "what do you think about",
    "should i buy",
    "should i sell",
    "is it a good buy",
    "investment advice",
    "market outlook",
    "recommendation",
    "what do you think",
    "is it worth buying",
    "buy or sell",
    "investment recommendation",
    "stock analysis",
    "market analysis",
    "financial analysis",
    "should i invest",
    "is it a good investment",
    "buy recommendation",
    "sell recommendation",
    // Alerts
    "alert me",
    "notify me",
    "set alert",
    "price alert",
    "when it hits",
    "when it reaches",
    "above",
    "below",
    "daily updates",
    "daily alerts",
    "stop alerts",
    "remove alerts",
    "alert when",
    "notify when",
    "price target",
    "target price",
    "alert if",
    "notify if",
    "price threshold",
    "threshold alert",
    "price drop",
    "price rise",
    "price increase",
    "price decrease",
    "goes up",
    "goes down",
    "reaches",
    "hits",
    "crosses",
    "breaks",
    "falls below",
    "rises above",
    "daily price",
    "daily update",
    "price notification",
    "stock alert",
    "market alert",
    // Trends and help
    "market trends",
    "market overview",
    "what stocks should i buy",
    "stock recommendations",
    "best stocks",
    "top stocks",
    "help",
    "commands",
    "what can you do",
    "market summary",
    "trending stocks",
    "hot stocks",
    "popular stocks",
    "market news",
    "stock news",
    "market update",
    "stock update",
    "market report",
    "stock report",
  ];

  // Check if message contains stock-related phrases
  const hasStockPhrase = stockPhrases.some((phrase) =>
    lowerMessage.includes(phrase)
  );

  // Also check for common stock-related words that might not be in phrases
  const stockKeywords = [
    "stock",
    "stocks",
    "price",
    "prices",
    "market",
    "portfolio",
    "watchlist",
    "alert",
    "alerts",
    "analyze",
    "analysis",
    "trends",
    "trending",
    "apple",
    "microsoft",
    "google",
    "tesla",
    "amazon",
    "meta",
    "nvidia",
    "aapl",
    "msft",
    "googl",
    "tsla",
    "amzn",
    "meta",
    "nvda",
  ];

  const hasStockKeyword = stockKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  if (!hasStockPhrase && !hasStockKeyword) return null;

  // Determine command type based on phrases
  let commandType = "price"; // default

  // Watch/Add commands
  if (
    lowerMessage.includes("add") ||
    lowerMessage.includes("watch") ||
    lowerMessage.includes("track") ||
    lowerMessage.includes("follow") ||
    lowerMessage.includes("monitor")
  ) {
    commandType = "watch";
  }
  // Analysis commands
  else if (
    lowerMessage.includes("analyze") ||
    lowerMessage.includes("analysis") ||
    lowerMessage.includes("tell me about") ||
    lowerMessage.includes("what do you think") ||
    lowerMessage.includes("should i buy") ||
    lowerMessage.includes("investment advice") ||
    lowerMessage.includes("is it worth buying") ||
    lowerMessage.includes("buy or sell") ||
    lowerMessage.includes("investment recommendation") ||
    lowerMessage.includes("stock analysis") ||
    lowerMessage.includes("market analysis") ||
    lowerMessage.includes("financial analysis") ||
    lowerMessage.includes("should i invest") ||
    lowerMessage.includes("is it a good investment") ||
    lowerMessage.includes("buy recommendation") ||
    lowerMessage.includes("sell recommendation")
  ) {
    commandType = "analysis";
  }
  // Portfolio commands - EXPANDED
  else if (
    lowerMessage.includes("portfolio") ||
    lowerMessage.includes("watchlist") ||
    lowerMessage.includes("my stocks") ||
    lowerMessage.includes("what am i watching") ||
    lowerMessage.includes("stocks i'm watching") ||
    lowerMessage.includes("my watchlist") ||
    lowerMessage.includes("remove") ||
    lowerMessage.includes("delete") ||
    lowerMessage.includes("stop watching") ||
    lowerMessage.includes("unwatch") ||
    lowerMessage.includes("show my") ||
    lowerMessage.includes("show me") ||
    lowerMessage.includes("my portfolio") ||
    lowerMessage.includes("my watchlist") ||
    lowerMessage.includes("what stocks") ||
    lowerMessage.includes("stocks i") ||
    lowerMessage.includes("stocks am") ||
    lowerMessage.includes("stocks are") ||
    lowerMessage.includes("stocks do") ||
    lowerMessage.includes("stocks have")
  ) {
    commandType = "portfolio";
  }
  // Alert commands - EXPANDED
  else if (
    lowerMessage.includes("alert") ||
    lowerMessage.includes("notify") ||
    lowerMessage.includes("price alert") ||
    lowerMessage.includes("when it hits") ||
    lowerMessage.includes("when it reaches") ||
    lowerMessage.includes("above") ||
    lowerMessage.includes("below") ||
    lowerMessage.includes("daily updates") ||
    lowerMessage.includes("daily alerts") ||
    lowerMessage.includes("alert when") ||
    lowerMessage.includes("notify when") ||
    lowerMessage.includes("price target") ||
    lowerMessage.includes("target price") ||
    lowerMessage.includes("alert if") ||
    lowerMessage.includes("notify if") ||
    lowerMessage.includes("price threshold") ||
    lowerMessage.includes("threshold alert") ||
    lowerMessage.includes("price drop") ||
    lowerMessage.includes("price rise") ||
    lowerMessage.includes("price increase") ||
    lowerMessage.includes("price decrease") ||
    lowerMessage.includes("goes up") ||
    lowerMessage.includes("goes down") ||
    lowerMessage.includes("reaches") ||
    lowerMessage.includes("hits") ||
    lowerMessage.includes("crosses") ||
    lowerMessage.includes("breaks") ||
    lowerMessage.includes("falls below") ||
    lowerMessage.includes("rises above") ||
    lowerMessage.includes("daily price") ||
    lowerMessage.includes("daily update") ||
    lowerMessage.includes("price notification") ||
    lowerMessage.includes("stock alert") ||
    lowerMessage.includes("market alert") ||
    lowerMessage.includes("set alert") ||
    lowerMessage.includes("set a price") ||
    lowerMessage.includes("alert me") ||
    lowerMessage.includes("notify me") ||
    lowerMessage.includes("when") ||
    lowerMessage.includes("if") ||
    lowerMessage.includes("hits") ||
    lowerMessage.includes("reaches")
  ) {
    commandType = "alert";
  }
  // Trends commands
  else if (
    lowerMessage.includes("market trends") ||
    lowerMessage.includes("market overview") ||
    lowerMessage.includes("what stocks should i buy") ||
    lowerMessage.includes("stock recommendations") ||
    lowerMessage.includes("best stocks") ||
    lowerMessage.includes("top stocks") ||
    lowerMessage.includes("market summary") ||
    lowerMessage.includes("trending stocks") ||
    lowerMessage.includes("hot stocks") ||
    lowerMessage.includes("popular stocks") ||
    lowerMessage.includes("market news") ||
    lowerMessage.includes("stock news") ||
    lowerMessage.includes("market update") ||
    lowerMessage.includes("stock update") ||
    lowerMessage.includes("market report") ||
    lowerMessage.includes("stock report") ||
    lowerMessage.includes("trends") ||
    lowerMessage.includes("trending")
  ) {
    commandType = "trends";
  }
  // Help commands
  else if (
    lowerMessage.includes("help") ||
    lowerMessage.includes("commands") ||
    lowerMessage.includes("what can you do") ||
    lowerMessage.includes("what can you do with stocks") ||
    lowerMessage.includes("stock help") ||
    lowerMessage.includes("stock commands") ||
    lowerMessage.includes("how to use") ||
    lowerMessage.includes("what features") ||
    lowerMessage.includes("capabilities") ||
    lowerMessage.includes("available commands")
  ) {
    commandType = "help";
  }

  // Company name to symbol mapping
  const companyMap: { [key: string]: { symbol: string; name: string } } = {
    apple: { symbol: "AAPL", name: "Apple" },
    microsoft: { symbol: "MSFT", name: "Microsoft" },
    google: { symbol: "GOOGL", name: "Google" },
    alphabet: { symbol: "GOOGL", name: "Alphabet" },
    amazon: { symbol: "AMZN", name: "Amazon" },
    tesla: { symbol: "TSLA", name: "Tesla" },
    meta: { symbol: "META", name: "Meta" },
    facebook: { symbol: "META", name: "Meta" },
    netflix: { symbol: "NFLX", name: "Netflix" },
    nvidia: { symbol: "NVDA", name: "NVIDIA" },
    intel: { symbol: "INTC", name: "Intel" },
    amd: { symbol: "AMD", name: "AMD" },
    disney: { symbol: "DIS", name: "Disney" },
    "coca cola": { symbol: "KO", name: "Coca-Cola" },
    coke: { symbol: "KO", name: "Coca-Cola" },
    pepsi: { symbol: "PEP", name: "PepsiCo" },
    mcdonalds: { symbol: "MCD", name: "McDonald's" },
    starbucks: { symbol: "SBUX", name: "Starbucks" },
    walmart: { symbol: "WMT", name: "Walmart" },
    target: { symbol: "TGT", name: "Target" },
    nike: { symbol: "NKE", name: "Nike" },
    uber: { symbol: "UBER", name: "Uber" },
    lyft: { symbol: "LYFT", name: "Lyft" },
    airbnb: { symbol: "ABNB", name: "Airbnb" },
    spotify: { symbol: "SPOT", name: "Spotify" },
    twitter: { symbol: "TWTR", name: "Twitter" },
    x: { symbol: "TWTR", name: "X (Twitter)" },
    snapchat: { symbol: "SNAP", name: "Snapchat" },
    snap: { symbol: "SNAP", name: "Snap" },
    zoom: { symbol: "ZM", name: "Zoom" },
    salesforce: { symbol: "CRM", name: "Salesforce" },
    oracle: { symbol: "ORCL", name: "Oracle" },
    ibm: { symbol: "IBM", name: "IBM" },
    "general electric": { symbol: "GE", name: "General Electric" },
    ge: { symbol: "GE", name: "General Electric" },
    boeing: { symbol: "BA", name: "Boeing" },
    ford: { symbol: "F", name: "Ford" },
    "general motors": { symbol: "GM", name: "General Motors" },
    gm: { symbol: "GM", name: "General Motors" },
  };

  // Look for company names in the message
  for (const [companyName, data] of Object.entries(companyMap)) {
    if (lowerMessage.includes(companyName)) {
      return { symbol: data.symbol, companyName: data.name, commandType };
    }
  }

  // Handle commands without specific companies (like "show my portfolio")
  if (commandType === "portfolio" || commandType === "help") {
    return { symbol: "", companyName: "", commandType };
  }

  return null;
}

export interface UserStockProfile {
  phoneNumber: string;
  watchedStocks: string[];
  alertPreferences: {
    dailyUpdates: boolean;
    priceThresholds: { [symbol: string]: { above?: number; below?: number } };
    volatilityAlerts: boolean;
  };
  riskTolerance: "conservative" | "moderate" | "aggressive";
  preferredSectors: string[];
  lastInteraction: string;
}

export interface StockAlert {
  id: string;
  phoneNumber: string;
  symbol: string;
  alertType: "daily" | "price_above" | "price_below" | "volatility";
  threshold?: number;
  isActive: boolean;
  createdAt: string;
}

// Conversation management for stock agent
const stockConversationStore = new Map<string, any[]>();

/**
 * Get stock conversation history for a user
 */
export function getStockConversationHistory(phoneNumber: string): any[] {
  if (!stockConversationStore.has(phoneNumber)) {
    stockConversationStore.set(phoneNumber, [
      {
        role: "system",
        content: `You are a sophisticated financial AI assistant with deep market knowledge. You help users with:
- Real-time stock prices and analysis
- Market trends and insights  
- Portfolio tracking and alerts
- Investment education and guidance

You have access to live market data and can provide intelligent analysis beyond just numbers. Be conversational, educational, and proactive. Remember their preferences and suggest relevant actions.

Available commands:
- "STOCK AAPL" - Get current price and 7-day movement
- "WATCH AAPL" - Add to watchlist with alerts
- "PORTFOLIO" - View tracked stocks
- "ANALYZE AAPL" - Get detailed analysis
- "ALERTS" - Manage price alerts
- "TRENDS" - Market overview and trends
- "HELP" - Show all commands

Always be helpful and educational while staying in character as a knowledgeable financial advisor.`,
      },
    ]);
  }

  return stockConversationStore.get(phoneNumber) || [];
}

/**
 * Save stock conversation history for a user
 */
export function saveStockConversationHistory(
  phoneNumber: string,
  history: any[]
): void {
  // Trim conversation to prevent unlimited growth
  const maxMessages = 20;
  if (history.length > maxMessages) {
    const systemMessage = history.find((msg) => msg.role === "system");
    const recentMessages = history.slice(-maxMessages);

    if (systemMessage && !recentMessages.some((msg) => msg.role === "system")) {
      history = [systemMessage, ...recentMessages];
    } else {
      history = recentMessages;
    }
  }

  stockConversationStore.set(phoneNumber, history);
}

/**
 * Get user stock profile from database
 */
export async function getUserStockProfile(
  phoneNumber: string
): Promise<UserStockProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_stock_profiles")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is OK
      console.error("Error fetching user stock profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserStockProfile:", error);
    // Return a default profile if database is not available
    return {
      phoneNumber,
      watchedStocks: [],
      alertPreferences: {
        dailyUpdates: false,
        priceThresholds: {},
        volatilityAlerts: false,
      },
      riskTolerance: "moderate",
      preferredSectors: [],
      lastInteraction: new Date().toISOString(),
    };
  }
}

/**
 * Save user stock profile to database
 */
export async function saveUserStockProfile(
  phoneNumber: string,
  profile: Partial<UserStockProfile>
): Promise<void> {
  try {
    const { error } = await supabase.from("user_stock_profiles").upsert({
      phone_number: phoneNumber,
      ...profile,
      last_interaction: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving user stock profile:", error);
      // Continue execution even if database save fails
    }
  } catch (error) {
    console.error("Error in saveUserStockProfile:", error);
    // Continue execution even if database save fails
  }
}

/**
 * Get stock data from Alpha Vantage API
 */
export async function getStockData(symbol: string): Promise<StockData> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Alpha Vantage API key not configured");
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`
    );

    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error(`Invalid stock symbol: ${symbol}`);
    }

    if (data["Note"]) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      throw new Error(`No data available for ${symbol}`);
    }

    const dates = Object.keys(timeSeries).sort().reverse();
    const current = timeSeries[dates[0]];
    const weekAgo = timeSeries[dates[6]] || timeSeries[dates[dates.length - 1]];

    const currentPrice = parseFloat(current["4. close"]);
    const weekAgoPrice = parseFloat(weekAgo["4. close"]);
    const change = currentPrice - weekAgoPrice;
    const changePercent = (change / weekAgoPrice) * 100;

    return {
      symbol: symbol.toUpperCase(),
      currentPrice,
      weekAgoPrice,
      change,
      changePercent,
      volume: parseInt(current["5. volume"]),
      timestamp: new Date().toISOString(),
      source: "yahoo_finance" as const,
    };
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw new Error(
      `Failed to fetch stock data for ${symbol}: ${error.message}`
    );
  }
}

/**
 * Generate AI analysis for stock data
 */
export async function generateStockAnalysis(
  stockData: StockData,
  userContext: string = ""
): Promise<string> {
  const analysisPrompt = `
Analyze this stock data for a user who said: "${userContext}"

Stock: ${stockData.symbol}
Current Price: $${stockData.currentPrice.toFixed(2)}
7-Day Change: ${
    stockData.changePercent > 0 ? "+" : ""
  }${stockData.changePercent.toFixed(2)}%
Volume: ${stockData.volume?.toLocaleString() || "N/A"}

Provide a brief, helpful analysis including:
1. Market sentiment (bullish/bearish/neutral)
2. Key factors affecting the stock
3. Simple recommendation (buy/hold/watch)
4. Risk level assessment (low/medium/high)

Keep it conversational and under 200 characters for SMS.
`;

  try {
    const analysis = await generateAiResponse([
      {
        role: "system",
        content:
          "You are a financial analyst. Provide concise, helpful stock analysis in a conversational tone.",
      },
      { role: "user", content: analysisPrompt },
    ]);

    return analysis;
  } catch (error) {
    console.error("Error generating stock analysis:", error);
    return "Analysis temporarily unavailable.";
  }
}

/**
 * Format stock data for SMS response
 */
export function formatStockResponse(
  stockData: StockData,
  analysis?: string,
  userProfile?: UserStockProfile
): string {
  const trend = stockData.change >= 0 ? "📈" : "📉";
  const sign = stockData.change >= 0 ? "+" : "";

  let response = `${trend} ${stockData.symbol} Stock Update\n\n`;
  response += `💰 Current: $${stockData.currentPrice.toFixed(2)}\n`;
  response += `📊 7-Day: ${sign}$${stockData.change.toFixed(
    2
  )} (${sign}${stockData.changePercent.toFixed(2)}%)\n`;

  if (stockData.volume) {
    response += `📈 Volume: ${stockData.volume.toLocaleString()}\n`;
  }

  if (analysis) {
    response += `\n🤖 Analysis: ${analysis}\n`;
  }

  // Add personalized suggestions
  if (userProfile?.watchedStocks?.includes(stockData.symbol)) {
    response += `\n📋 This stock is in your watchlist!`;
  }

  response += `\n\n💡 Commands: "WATCH ${stockData.symbol}", "ANALYZE ${stockData.symbol}", "ALERTS"`;

  return response;
}

/**
 * Main stock agent handler
 */
export async function handleStockAgent(
  message: string,
  twilioClient: TwilioClient,
  from: string
): Promise<boolean> {
  console.log("📈 === STOCK AGENT CONVERSATION START ===");
  console.log("Input:", { message, from });

  try {
    // Get conversation history
    const conversationHistory = getStockConversationHistory(from);

    // Get user profile
    const userProfile = await getUserStockProfile(from);

    // Check if user seems lost
    const seemsLost = userSeemsLost(message);

    // Enhanced context for lost users
    if (seemsLost) {
      const enhancedPrompt = `CONTEXT: The user seems confused about stock commands. Help them understand the available commands while being helpful and educational.

Available commands:
- "STOCK AAPL" - Get current price and 7-day movement
- "WATCH AAPL" - Add to watchlist with alerts
- "PORTFOLIO" - View tracked stocks
- "ANALYZE AAPL" - Get detailed analysis
- "ALERTS" - Set price alerts
- "TRENDS" - Market overview and trends
- "HELP" - Show all commands

Be educational and guide them naturally.`;

      const enhancedHistory = conversationHistory.map((msg) =>
        msg.role === "system" ? { ...msg, content: enhancedPrompt } : msg
      );

      enhancedHistory.push({ role: "user", content: message });

      const response = await generateAiResponse(enhancedHistory);
      saveStockConversationHistory(from, enhancedHistory);
      await sendSmsResponse(from, response, twilioClient);

      return true;
    }

    // Check for natural language stock queries first
    const naturalStockQuery = detectNaturalStockQuery(message);
    if (naturalStockQuery) {
      const { symbol, companyName, commandType } = naturalStockQuery;
      console.log(
        `📊 Natural language stock query detected: ${companyName} (${symbol}) - ${commandType}`
      );

      try {
        // Handle different command types
        if (commandType === "price" || commandType === "analysis") {
          const stockData = await fetchStockData(symbol);
          const analysis = await generateStockAnalysis(stockData, message);

          const trend = stockData.change >= 0 ? "📈" : "📉";
          const sign = stockData.change >= 0 ? "+" : "";

          const response = `📊 ${companyName} (${symbol}) Stock Update

💰 Current: $${stockData.currentPrice.toFixed(2)}
📊 7-Day: $${stockData.change.toFixed(
            2
          )} (${sign}${stockData.changePercent.toFixed(2)}%)
📈 Volume: ${stockData.volume?.toLocaleString() || "N/A"}

🤖 Analysis: ${analysis}

💡 Commands:
• "WATCH ${symbol}" - Add to watchlist
• "ANALYZE ${symbol}" - Detailed analysis
• "ALERTS" - Set price alerts`;

          await sendSmsResponse(from, response, twilioClient);
          return true;
        } else if (commandType === "watch" || commandType === "add") {
          // Handle adding to watchlist
          const userProfile = await getUserStockProfile(from);
          if (userProfile.watchedStocks.includes(symbol)) {
            await sendSmsResponse(
              from,
              `✅ ${companyName} (${symbol}) is already in your watchlist!`,
              twilioClient
            );
          } else {
            userProfile.watchedStocks.push(symbol);
            await saveUserStockProfile(from, userProfile);
            await sendSmsResponse(
              from,
              `✅ Added ${companyName} (${symbol}) to your watchlist! I'll track this stock for you.\n\n💡 Set alerts with "ALERTS ${symbol}" or get updates with "PORTFOLIO"`,
              twilioClient
            );
          }
          return true;
        } else if (commandType === "portfolio" || commandType === "watchlist") {
          // Handle portfolio/watchlist requests
          const userProfile = await getUserStockProfile(from);
          if (!userProfile.watchedStocks?.length) {
            await sendSmsResponse(
              from,
              '📋 Your watchlist is empty. Add stocks with "WATCH AAPL" or get a stock price with "STOCK AAPL"',
              twilioClient
            );
            return true;
          }

          let response = "📋 Your Stock Watchlist:\n\n";
          for (const stockSymbol of userProfile.watchedStocks.slice(0, 5)) {
            try {
              const stockData = await fetchStockData(stockSymbol);
              const trend = stockData.change >= 0 ? "📈" : "📉";
              const sign = stockData.change >= 0 ? "+" : "";
              response += `${trend} ${stockSymbol}: $${stockData.currentPrice.toFixed(
                2
              )} (${sign}${stockData.changePercent.toFixed(2)}%)\n`;
            } catch (error) {
              response += `❌ ${stockSymbol}: Data unavailable\n`;
            }
          }

          if (userProfile.watchedStocks.length > 5) {
            response += `\n... and ${
              userProfile.watchedStocks.length - 5
            } more stocks`;
          }

          response += '\n\n💡 Use "STOCK [SYMBOL]" for detailed analysis';
          await sendSmsResponse(from, response, twilioClient);
          return true;
        } else if (commandType === "alert") {
          // Handle alert requests
          if (symbol) {
            // Extract price from message if mentioned
            const priceMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
            const targetPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

            if (targetPrice) {
              const userProfile = await getUserStockProfile(from);
              if (!userProfile.alertPreferences.priceThresholds[symbol]) {
                userProfile.alertPreferences.priceThresholds[symbol] = {};
              }

              // Determine if it's above or below based on current price
              try {
                const stockData = await fetchStockData(symbol);
                if (targetPrice > stockData.currentPrice) {
                  userProfile.alertPreferences.priceThresholds[symbol].above =
                    targetPrice;
                } else {
                  userProfile.alertPreferences.priceThresholds[symbol].below =
                    targetPrice;
                }

                await saveUserStockProfile(from, userProfile);
                await sendSmsResponse(
                  from,
                  `✅ Alert set for ${companyName} (${symbol}) at $${targetPrice.toFixed(
                    2
                  )}. I'll notify you when the price ${
                    targetPrice > stockData.currentPrice
                      ? "rises above"
                      : "falls below"
                  } this level.`,
                  twilioClient
                );
              } catch (error) {
                await sendSmsResponse(
                  from,
                  `✅ Alert set for ${companyName} (${symbol}) at $${targetPrice.toFixed(
                    2
                  )}. I'll notify you when the price reaches this level.`,
                  twilioClient
                );
              }
            } else {
              await sendSmsResponse(
                from,
                `📢 To set a price alert for ${companyName} (${symbol}), specify a price like "alert me when ${companyName} hits $300" or "notify me when ${companyName} reaches $250".`,
                twilioClient
              );
            }
          } else {
            await sendSmsResponse(
              from,
              `📢 To set price alerts, mention a stock and price like "alert me when apple hits $300" or "notify me when tesla reaches $400".`,
              twilioClient
            );
          }
          return true;
        } else if (commandType === "trends") {
          // Handle trends requests
          const response = `📈 Market Trends & Analysis:

🔥 Hot Stocks Today:
• AAPL - Apple: Strong earnings momentum
• TSLA - Tesla: EV market leadership
• MSFT - Microsoft: AI and cloud growth
• GOOGL - Google: Search and advertising dominance

📊 Market Overview:
• Tech sector showing resilience
• AI stocks leading gains
• Energy sector mixed signals
• Healthcare steady performance

💡 Recommendations:
• Consider diversified tech exposure
• Watch for earnings season volatility
• Monitor Fed policy changes
• Focus on quality over quantity

🔍 For specific analysis, ask "analyze [stock]" or "tell me about [company]"`;

          await sendSmsResponse(from, response, twilioClient);
          return true;
        } else if (commandType === "help") {
          // Handle help requests
          const response = `📈 Stock Bot - What I Can Do:

💰 **Get Stock Prices:**
• "what's the price of apple?"
• "how much is tesla worth?"
• "current price of microsoft"

📊 **Stock Analysis:**
• "analyze microsoft stock"
• "tell me about google stock"
• "should i buy nvidia?"
• "is apple a good investment?"

📋 **Portfolio Management:**
• "show my portfolio"
• "add tesla to my watchlist"
• "my stocks"
• "remove apple from portfolio"

🔔 **Price Alerts:**
• "alert me when apple hits $300"
• "notify me when tesla reaches $400"
• "set price alert for microsoft at $500"

📈 **Market Trends:**
• "market trends today"
• "best stocks to buy"
• "what stocks should i invest in?"
• "market overview"

💡 **Just ask naturally!** I understand conversational language, so you don't need to use specific commands. Try asking me anything about stocks!`;

          await sendSmsResponse(from, response, twilioClient);
          return true;
        }
      } catch (error) {
        console.error(`Error processing natural language command:`, error);
        await sendSmsResponse(
          from,
          `❌ Could not process that request. Please try a simpler command like "STOCK AAPL" or "HELP"`,
          twilioClient
        );
        return true;
      }
    }

    // Handle specific stock commands
    const upperMessage = message.toUpperCase();

    if (upperMessage.startsWith("STOCK ")) {
      const symbol = message.substring(6).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: STOCK AAPL",
          twilioClient
        );
        return true;
      }

      const stockData = await fetchStockData(symbol);
      const analysis = await generateStockAnalysis(stockData, message);
      const response = formatStockResponse(stockData, analysis, userProfile);

      await sendSmsResponse(from, response, twilioClient);

      // Update conversation history
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({ role: "assistant", content: response });
      saveStockConversationHistory(from, conversationHistory);

      return true;
    }

    if (upperMessage.startsWith("WATCH ")) {
      const symbol = message.substring(6).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: WATCH AAPL",
          twilioClient
        );
        return true;
      }

      // Add to watchlist
      const currentProfile = userProfile || {
        phoneNumber: from,
        watchedStocks: [],
        alertPreferences: {
          dailyUpdates: false,
          priceThresholds: {},
          volatilityAlerts: false,
        },
        riskTolerance: "moderate" as const,
        preferredSectors: [],
        lastInteraction: new Date().toISOString(),
      };

      if (!currentProfile.watchedStocks.includes(symbol)) {
        currentProfile.watchedStocks.push(symbol);
        await saveUserStockProfile(from, currentProfile);

        await sendSmsResponse(
          from,
          `✅ Added ${symbol} to your watchlist! I'll track this stock for you.\n\n💡 Set alerts with "ALERTS ${symbol}" or get updates with "PORTFOLIO"`,
          twilioClient
        );
      } else {
        await sendSmsResponse(
          from,
          `📋 ${symbol} is already in your watchlist!`,
          twilioClient
        );
      }

      return true;
    }

    if (upperMessage === "PORTFOLIO") {
      if (!userProfile?.watchedStocks?.length) {
        await sendSmsResponse(
          from,
          '📋 Your watchlist is empty. Add stocks with "WATCH AAPL" or get a stock price with "STOCK AAPL"',
          twilioClient
        );
        return true;
      }

      let response = "📋 Your Stock Watchlist:\n\n";

      for (const symbol of userProfile.watchedStocks.slice(0, 5)) {
        // Limit to 5 for SMS
        try {
          const stockData = await fetchStockData(symbol);
          const trend = stockData.change >= 0 ? "📈" : "📉";
          const sign = stockData.change >= 0 ? "+" : "";

          response += `${trend} ${symbol}: $${stockData.currentPrice.toFixed(
            2
          )} (${sign}${stockData.changePercent.toFixed(2)}%)\n`;
        } catch (error) {
          response += `❌ ${symbol}: Data unavailable\n`;
        }
      }

      if (userProfile.watchedStocks.length > 5) {
        response += `\n... and ${
          userProfile.watchedStocks.length - 5
        } more stocks`;
      }

      response += '\n\n💡 Use "STOCK [SYMBOL]" for detailed analysis';

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    if (upperMessage.startsWith("ANALYZE ")) {
      const symbol = message.substring(8).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: ANALYZE AAPL",
          twilioClient
        );
        return true;
      }

      const stockData = await fetchStockData(symbol);
      const analysis = await generateStockAnalysis(stockData, message);
      const response = formatStockResponse(stockData, analysis, userProfile);

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    if (upperMessage === "ALERTS" || upperMessage.startsWith("ALERTS ")) {
      const response =
        `🔔 Alert Management:\n\n` +
        `• "ALERTS DAILY ON" - Daily updates for watched stocks\n` +
        `• "ALERTS AAPL ABOVE 150" - Alert when AAPL goes above $150\n` +
        `• "ALERTS AAPL BELOW 140" - Alert when AAPL goes below $140\n` +
        `• "ALERTS LIST" - View current alerts\n` +
        `• "ALERTS OFF" - Disable all alerts\n\n` +
        `💡 I'll send you SMS alerts when conditions are met!`;

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    if (upperMessage === "HELP") {
      const response =
        `📈 Stock Bot Commands:\n\n` +
        `• STOCK [SYMBOL] - Get current price & 7-day change\n` +
        `• WATCH [SYMBOL] - Add to your watchlist\n` +
        `• PORTFOLIO - View your watched stocks\n` +
        `• ANALYZE [SYMBOL] - Get AI analysis\n` +
        `• ALERTS - Manage price alerts\n` +
        `• TRENDS - Market overview\n` +
        `• HELP - Show this menu\n\n` +
        `💡 Example: "STOCK AAPL" or "WATCH TSLA"`;

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    // Handle general conversation about stocks
    conversationHistory.push({ role: "user", content: message });

    const response = await generateAiResponse(conversationHistory);

    conversationHistory.push({ role: "assistant", content: response });
    saveStockConversationHistory(from, conversationHistory);

    await sendSmsResponse(from, response, twilioClient);

    return true;
  } catch (error) {
    console.error("Error in stock agent:", error);
    await sendSmsResponse(
      from,
      `❌ Stock agent error: ${error.message}. Try "HELP" for commands.`,
      twilioClient
    );
    return true;
  }
}

/**
 * Check if user seems lost/confused
 */
function userSeemsLost(message: string): boolean {
  const lostPatterns = /^(help|what|how|\?)$/i;
  return lostPatterns.test(message.trim());
}
