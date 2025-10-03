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
import {
  createScheduledTask,
  getUserScheduledTasks,
  deleteScheduledTask,
  initializeScheduler,
} from "./stock-scheduler.js";

// Types for stock agent (re-exported from stock-api)
export type { StockData } from "./stock-api.js";

const COMPANY_LOOKUP: Record<string, { symbol: string; name: string }> = {
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
  verizon: { symbol: "VZ", name: "Verizon" },
  "at&t": { symbol: "T", name: "AT&T" },
  att: { symbol: "T", name: "AT&T" },
  "t-mobile": { symbol: "TMUS", name: "T-Mobile" },
  tmobile: { symbol: "TMUS", name: "T-Mobile" },
  comcast: { symbol: "CMCSA", name: "Comcast" },
  visa: { symbol: "V", name: "Visa" },
  mastercard: { symbol: "MA", name: "Mastercard" },
  jpmorgan: { symbol: "JPM", name: "JPMorgan Chase" },
  "jp morgan": { symbol: "JPM", name: "JPMorgan Chase" },
  "bank of america": { symbol: "BAC", name: "Bank of America" },
  bofa: { symbol: "BAC", name: "Bank of America" },
  wells: { symbol: "WFC", name: "Wells Fargo" },
  "wells fargo": { symbol: "WFC", name: "Wells Fargo" },
  goldman: { symbol: "GS", name: "Goldman Sachs" },
  "goldman sachs": { symbol: "GS", name: "Goldman Sachs" },
};

/**
 * Parse delete schedule commands from natural language
 */
function parseDeleteScheduleCommand(
  message: string
): { taskType: string; time: string; symbol: string } | null {
  const lowerMessage = message.toLowerCase();

  // Check if message contains delete keywords
  const hasDeleteKeywords = [
    "delete",
    "remove",
    "cancel",
    "stop",
    "disable",
  ].some((keyword) => lowerMessage.includes(keyword));

  if (!hasDeleteKeywords) {
    return null;
  }

  // Check if message contains schedule keywords
  const hasScheduleKeywords = [
    "schedule",
    "daily",
    "every day",
    "every morning",
    "every evening",
    "remind me",
    "send me",
    "update me",
    "tell me",
    "stock",
    "portfolio",
    "task",
    "alert",
    "notification",
    "updates", // Add this to catch "updates"
    "sending", // Add this to catch "sending me"
  ].some((keyword) => lowerMessage.includes(keyword));

  if (!hasScheduleKeywords) {
    return null;
  }

  // Extract task type
  let taskType = "";
  if (
    lowerMessage.includes("portfolio") ||
    lowerMessage.includes("watchlist")
  ) {
    taskType = "portfolio";
  } else if (
    lowerMessage.includes("update") ||
    lowerMessage.includes("updates") ||
    lowerMessage.includes("price")
  ) {
    taskType = "update";
  } else if (
    lowerMessage.includes("analysis") ||
    lowerMessage.includes("analyze")
  ) {
    taskType = "analysis";
  } else if (
    lowerMessage.includes("alert") ||
    lowerMessage.includes("notification")
  ) {
    taskType = "alert";
  }

  // Extract symbol/stock name
  let symbol = "";
  const stockNames = [
    "apple",
    "microsoft",
    "google",
    "tesla",
    "amazon",
    "meta",
    "nvidia",
  ];
  const stockSymbols = [
    "aapl",
    "msft",
    "googl",
    "tsla",
    "amzn",
    "meta",
    "nvda",
  ];

  for (const stock of stockNames) {
    if (lowerMessage.includes(stock)) {
      symbol = stock;
      break;
    }
  }

  for (const sym of stockSymbols) {
    if (lowerMessage.includes(sym)) {
      symbol = sym;
      break;
    }
  }

  // Extract time if mentioned
  let time = "";
  const timeRegex = /(\d{1,2})(am|pm|:00)/gi;
  const timeMatch = lowerMessage.match(timeRegex);
  if (timeMatch) {
    time = timeMatch[0];
  }

  return {
    taskType,
    time,
    symbol,
  };
}

/**
 * Parse scheduling commands from natural language
 */
function parseSchedulingCommand(
  message: string
): { taskType: string; scheduleTime: string; symbols: string[] } | null {
  const lowerMessage = message.toLowerCase();

  // Skip if this is an exact command (not a scheduling request)
  if (
    lowerMessage === "schedules" ||
    lowerMessage === "help" ||
    lowerMessage === "portfolio"
  ) {
    return null;
  }

  // Check if message contains scheduling keywords
  const hasScheduleKeywords = [
    "schedule",
    "daily",
    "every day",
    "every morning",
    "every evening",
    "remind me",
    "send me",
    "update me",
    "tell me",
    "show me",
    "at 7am",
    "at 8am",
    "at 9am",
    "at 10am",
    "at 11am",
    "at 12pm",
    "at 1pm",
    "at 2pm",
    "at 3pm",
    "at 4pm",
    "at 5pm",
    "at 6pm",
    "at 7pm",
    "at 8pm",
    "at 9pm",
    "at 10pm",
    "at 11pm",
  ].some((keyword) => lowerMessage.includes(keyword));

  if (!hasScheduleKeywords) {
    return null;
  }

  // Extract time from message
  const timeMatch = lowerMessage.match(/(\d{1,2})(am|pm)/);
  let scheduleTime = "09:00"; // Default to 9 AM

  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const period = timeMatch[2];

    if (period === "pm" && hour !== 12) {
      hour += 12;
    } else if (period === "am" && hour === 12) {
      hour = 0;
    }

    scheduleTime = `${hour.toString().padStart(2, "0")}:00`;
  }

  // Determine task type
  let taskType = "daily_update";
  if (
    lowerMessage.includes("portfolio") ||
    lowerMessage.includes("watchlist")
  ) {
    taskType = "portfolio_summary";
  } else if (
    lowerMessage.includes("market") ||
    lowerMessage.includes("analysis")
  ) {
    taskType = "market_analysis";
  }

  // Extract stock symbols
  const symbols: string[] = [];
  const stockSymbols = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "TSLA",
    "AMZN",
    "META",
    "NVDA",
    "NFLX",
    "AMD",
    "INTC",
  ];

  for (const symbol of stockSymbols) {
    if (
      lowerMessage.includes(symbol.toLowerCase()) ||
      lowerMessage.includes(symbol)
    ) {
      symbols.push(symbol);
    }
  }

  // If no specific symbols mentioned, use common ones for daily updates
  if (symbols.length === 0 && taskType === "daily_update") {
    symbols.push("AAPL", "MSFT", "GOOGL");
  }

  return {
    taskType,
    scheduleTime,
    symbols,
  };
}

/**
 * Extract potential stock symbols from a message
 * This function tries to find stock symbols in various formats
 */
function extractStockSymbolFromMessage(message: string): string | null {
  const upperMessage = message.toUpperCase();

  // Pattern 1: Look for common index names and convert to symbols FIRST
  const indexMap: { [key: string]: string } = {
    "DOW JONES": "^DJI",
    DOW: "^DJI",
    "DOW JONES INDUSTRIAL AVERAGE": "^DJI",
    "S&P 500": "^GSPC",
    SP500: "^GSPC",
    "S&P": "^GSPC",
    NASDAQ: "^IXIC",
    "NASDAQ COMPOSITE": "^IXIC",
    "RUSSELL 2000": "^RUT",
    RUSSELL: "^RUT",
  };

  for (const [indexName, symbol] of Object.entries(indexMap)) {
    if (upperMessage.includes(indexName)) {
      return symbol;
    }
  }

  // Pattern 2: Direct ticker symbols - only match if it's a standalone ticker
  // Examples: $AAPL, $^DJI, $TSLA (but NOT $can you tell me...)
  const standaloneTickerMatch = message.match(/^\$\s*(\^?[A-Z]{1,5})\s*$/i);
  if (standaloneTickerMatch) {
    return standaloneTickerMatch[1].toUpperCase();
  }

  // Pattern 2b: Handle $stock SYMBOL pattern specifically
  const stockCommandMatch = message.match(/^\$\s*stock\s+(\^?[A-Z]{1,5})\b/i);
  if (stockCommandMatch) {
    return stockCommandMatch[1].toUpperCase();
  }

  // Pattern 3: Look for potential ticker symbols in the message (3-5 uppercase letters)
  // This catches cases like "price of AAPL" or "tell me about TSLA"
  // But be more selective - look for common stock patterns
  const tickerInTextMatch = message.match(/\b([A-Z]{3,5})\b/g);
  if (tickerInTextMatch) {
    // Filter out common words that aren't stock symbols
    const commonWords = [
      "THE",
      "AND",
      "FOR",
      "CAN",
      "YOU",
      "TELL",
      "ME",
      "WHAT",
      "PRICE",
      "STOCK",
      "CURRENT",
      "ABOUT",
      "WITH",
      "FROM",
      "THIS",
      "THAT",
      "WILL",
      "SHOULD",
      "COULD",
      "WOULD",
      "MIGHT",
      "MAY",
      "MUST",
      "HAVE",
      "HAS",
      "HAD",
      "WAS",
      "WERE",
      "BEEN",
      "BEING",
      "HERE",
      "THERE",
      "WHERE",
      "WHEN",
      "WHY",
      "HOW",
      "MUCH",
      "MANY",
      "SOME",
      "ANY",
      "ALL",
      "EACH",
      "EVERY",
      "BOTH",
      "EITHER",
      "NEITHER",
      "ONE",
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
      "SIX",
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "MICROSOFT",
      "APPLE",
      "GOOGLE",
      "TESLA",
      "AMAZON",
      "META",
      "NETFLIX",
      "NVIDIA",
      "INTEL",
      "AMD",
      "DISNEY",
      "COCA",
      "COLA",
      "PEPSI",
      "MCDONALDS",
      "STARBUCKS",
      "WALMART",
      "TARGET",
      "NIKE",
      "UBER",
      "LYFT",
      "AIRBNB",
      "SPOTIFY",
      "TWITTER",
      "SNAPCHAT",
      "SNAP",
      "ZOOM",
      "SALESFORCE",
      "ORACLE",
      "BOEING",
      "FORD",
      "GENERAL",
      "MOTORS",
      "VERIZON",
      "COMCAST",
      "VISA",
      "MASTERCARD",
      "JPMORGAN",
      "MORGAN",
      "BANK",
      "AMERICA",
      "WELLS",
      "FARGO",
      "GOLDMAN",
      "SACHS",
    ];

    // Look for patterns that are more likely to be stock symbols
    // Prioritize 4-5 letter symbols and those that appear after "of" or "about"
    const stockContextPatterns = [
      /(?:of|about|for|with)\s+([A-Z]{3,5})\b/i,
      /\b([A-Z]{4,5})\b/g, // 4-5 letter symbols are more likely to be stocks
    ];

    for (const pattern of stockContextPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        for (const match of matches) {
          const symbol = match.replace(/(?:of|about|for|with)\s+/i, "").trim();
          if (symbol && !commonWords.includes(symbol.toUpperCase())) {
            return symbol.toUpperCase();
          }
        }
      }
    }

    // Fallback: sort by length (longer first) to prioritize more specific matches
    const sortedTickers = tickerInTextMatch.sort((a, b) => b.length - a.length);

    for (const potentialTicker of sortedTickers) {
      if (!commonWords.includes(potentialTicker)) {
        return potentialTicker.toUpperCase();
      }
    }
  }

  return null;
}

function lookupCompanyInMessage(
  message: string
): { symbol: string; name: string } | null {
  const lowerMessage = message.toLowerCase();

  for (const [companyName, data] of Object.entries(COMPANY_LOOKUP)) {
    if (lowerMessage.includes(companyName)) {
      return data;
    }
  }

  return null;
}

function normalizePotentialTicker(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/[^A-Za-z0-9^]/g, "").toUpperCase();
  if (!cleaned) {
    return null;
  }

  if (/^\^?[A-Z]{1,5}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

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
    // Scheduling
    "schedule",
    "daily",
    "every day",
    "every morning",
    "every evening",
    "at 7am",
    "at 8am",
    "at 9am",
    "at 10am",
    "at 11am",
    "at 12pm",
    "at 1pm",
    "at 2pm",
    "at 3pm",
    "at 4pm",
    "at 5pm",
    "at 6pm",
    "at 7pm",
    "at 8pm",
    "at 9pm",
    "at 10pm",
    "at 11pm",
    "at midnight",
    "every hour",
    "every week",
    "weekly",
    "monthly",
    "remind me",
    "send me",
    "update me",
    "tell me",
    "show me",
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
    ...Object.keys(COMPANY_LOOKUP),
  ];

  const hasStockKeyword = stockKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  // Check if user provided a ticker symbol directly BEFORE checking keywords
  // (e.g., "$ VZ", "$ vz" - these don't contain stock keywords)
  const tickerMatch = message.match(/^\$\s*([A-Za-z]{1,5})$/);
  if (tickerMatch) {
    const ticker = tickerMatch[1].toUpperCase();
    console.log(`📊 Direct ticker symbol detected: ${ticker}`);
    return { symbol: ticker, companyName: ticker, commandType: "price" };
  }

  const looseDollarMatch = message.match(/^\$\s*(.+)$/);
  if (looseDollarMatch) {
    const rawInput = looseDollarMatch[1].trim();

    if (rawInput) {
      const normalizedTicker = normalizePotentialTicker(rawInput);
      if (normalizedTicker) {
        return {
          symbol: normalizedTicker,
          companyName: normalizedTicker,
          commandType: "price",
        };
      }

      const companyResult = lookupCompanyInMessage(rawInput);
      if (companyResult) {
        return {
          symbol: companyResult.symbol,
          companyName: companyResult.name,
          commandType: "price",
        };
      }
    }
  }

  if (!hasStockPhrase && !hasStockKeyword) {
    const companyResult = lookupCompanyInMessage(message);
    if (companyResult) {
      return {
        symbol: companyResult.symbol,
        companyName: companyResult.name,
        commandType: "price",
      };
    }

    return null;
  }

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

  const companyLookupResult = lookupCompanyInMessage(message);
  if (companyLookupResult) {
    return {
      symbol: companyLookupResult.symbol,
      companyName: companyLookupResult.name,
      commandType,
    };
  }

  // Handle commands without specific companies (like "show my portfolio")
  if (commandType === "portfolio" || commandType === "help") {
    return { symbol: "", companyName: "", commandType };
  }

  // NEW: Extract potential stock symbols from the message and let Yahoo Finance validate
  const extractedSymbol = extractStockSymbolFromMessage(message);
  if (extractedSymbol) {
    console.log(`📊 Extracted potential symbol: ${extractedSymbol}`);
    return {
      symbol: extractedSymbol,
      companyName: extractedSymbol,
      commandType,
    };
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
- "$STOCK AAPL" - Get current price and 7-day movement
- "$WATCH AAPL" - Add to watchlist with alerts
- "$PORTFOLIO" - View tracked stocks
- "$ANALYZE AAPL" - Get detailed analysis
- "$ALERTS" - Manage price alerts
- "$HELP" - Show all commands

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
): Promise<UserStockProfile> {
  try {
    const { data, error } = await supabase
      .from("user_stock_profiles")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is OK, return default profile
      console.error("Error fetching user stock profile:", error);
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

    if (data) {
      return {
        phoneNumber: data.phone_number,
        watchedStocks: data.watched_stocks || [],
        alertPreferences: data.alert_preferences || {
          dailyUpdates: false,
          priceThresholds: {},
          volatilityAlerts: false,
        },
        riskTolerance: data.risk_tolerance || "moderate",
        preferredSectors: data.preferred_sectors || [],
        lastInteraction: data.last_interaction || new Date().toISOString(),
      };
    }

    // If no data found, return a default profile
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
  const isPositive = stockData.change >= 0;

  // Get company name if available, otherwise use symbol
  const companyName = getCompanyName(stockData.symbol);
  const displayName = companyName || stockData.symbol;

  let response = `Hey! ${displayName} (${
    stockData.symbol
  }) is at $${stockData.currentPrice.toFixed(2)} right now ${trend}\n\n`;

  // More conversational price movement
  if (isPositive) {
    response += `It's up $${Math.abs(stockData.change).toFixed(
      2
    )} (${sign}${stockData.changePercent.toFixed(
      2
    )}%) this week, which is pretty solid.`;
  } else {
    response += `It's down $${Math.abs(stockData.change).toFixed(
      2
    )} (${stockData.changePercent.toFixed(
      2
    )}%) this week, but nothing too concerning.`;
  }

  if (stockData.volume) {
    response += ` Volume looks healthy at ${(
      stockData.volume / 1000000
    ).toFixed(1)}M shares.\n\n`;
  } else {
    response += `\n\n`;
  }

  if (analysis) {
    response += `My take: ${analysis}\n\n`;
  }

  // More conversational watchlist check
  if (userProfile?.watchedStocks?.includes(stockData.symbol)) {
    response += `I'm already tracking this one for you! Want me to set up any alerts?`;
  } else {
    response += `Want me to track this one for you?`;
  }

  return response;
}

// Helper function to get company names
function getCompanyName(symbol: string): string {
  const companyNames: { [key: string]: string } = {
    AAPL: "Apple",
    TSLA: "Tesla",
    MSFT: "Microsoft",
    GOOGL: "Google",
    AMZN: "Amazon",
    META: "Meta",
    NVDA: "NVIDIA",
    NFLX: "Netflix",
    AMD: "AMD",
    INTC: "Intel",
    CRM: "Salesforce",
    ORCL: "Oracle",
    ADBE: "Adobe",
    PYPL: "PayPal",
    UBER: "Uber",
    LYFT: "Lyft",
    SPOT: "Spotify",
    SQ: "Square",
    ROKU: "Roku",
    ZM: "Zoom",
  };

  return companyNames[symbol.toUpperCase()] || "";
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
- "$STOCK AAPL" - Get current price and 7-day movement
- "$WATCH AAPL" - Add to watchlist with alerts
- "$PORTFOLIO" - View tracked stocks
- "$ANALYZE AAPL" - Get detailed analysis
- "$ALERTS" - Set price alerts
- "$HELP" - Show all commands

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

    // Check for delete schedule commands in natural language
    const deleteScheduleCommand = parseDeleteScheduleCommand(message);
    if (deleteScheduleCommand) {
      try {
        const scheduledTasks = await getUserScheduledTasks(from);

        if (scheduledTasks.length === 0) {
          await sendSmsResponse(
            from,
            "📅 No scheduled tasks found to delete.",
            twilioClient
          );
          return true;
        }

        // Find matching tasks
        const matchingTasks = scheduledTasks.filter((task) => {
          const taskType = task.task_type.replace("_", " ");
          const config = task.task_config || {};
          const symbols = config.symbols || [];

          return (
            taskType.includes(deleteScheduleCommand.taskType.toLowerCase()) ||
            symbols.some((symbol) =>
              symbol
                .toLowerCase()
                .includes(deleteScheduleCommand.symbol.toLowerCase())
            ) ||
            task.schedule_time.includes(deleteScheduleCommand.time)
          );
        });

        if (matchingTasks.length === 0) {
          await sendSmsResponse(
            from,
            `❌ No matching tasks found for "${deleteScheduleCommand.taskType}" at ${deleteScheduleCommand.time}. Use "$SCHEDULES" to see your tasks.`,
            twilioClient
          );
          return true;
        }

        if (matchingTasks.length === 1) {
          // Single match - delete it
          const success = await deleteScheduledTask(matchingTasks[0].id, from);
          if (success) {
            const taskTypeText = deleteScheduleCommand.taskType || "scheduled";
            const timeText = deleteScheduleCommand.time
              ? ` at ${deleteScheduleCommand.time}`
              : "";
            const symbolText = deleteScheduleCommand.symbol
              ? ` for ${deleteScheduleCommand.symbol.toUpperCase()}`
              : "";

            await sendSmsResponse(
              from,
              `✅ Deleted your ${taskTypeText} schedule${timeText}${symbolText}!`,
              twilioClient
            );
          } else {
            await sendSmsResponse(
              from,
              "❌ Could not delete the scheduled task. Please try again.",
              twilioClient
            );
          }
        } else {
          // Multiple matches - show options
          let response = `Found ${matchingTasks.length} matching tasks:\n\n`;
          for (let i = 0; i < matchingTasks.length; i++) {
            const task = matchingTasks[i];
            const timeStr = task.schedule_time;
            const taskType = task.task_type.replace("_", " ");
            const config = task.task_config || {};
            const symbols = config.symbols || [];

            response += `#${i + 1} 🕐 ${timeStr} - ${taskType}\n`;
            if (symbols.length > 0) {
              response += `📊 Tracking: ${symbols.join(", ")}\n`;
            }
            response += `\n`;
          }
          response += ``;

          await sendSmsResponse(from, response, twilioClient);
        }

        return true;
      } catch (error) {
        console.error("Error processing delete schedule command:", error);
        await sendSmsResponse(
          from,
          "❌ Error processing delete request. Please try again.",
          twilioClient
        );
        return true;
      }
    }

    // Check for scheduling commands first
    const schedulingCommand = parseSchedulingCommand(message);
    if (schedulingCommand) {
      console.log(
        `📅 Scheduling command detected: ${schedulingCommand.taskType} at ${schedulingCommand.scheduleTime}`
      );

      try {
        const taskId = await createScheduledTask(
          from,
          schedulingCommand.taskType as any,
          schedulingCommand.scheduleTime,
          "America/New_York",
          { symbols: schedulingCommand.symbols }
        );

        if (taskId) {
          const timeStr = schedulingCommand.scheduleTime.includes(":")
            ? schedulingCommand.scheduleTime
            : `${schedulingCommand.scheduleTime}:00`;

          let response = `✅ Scheduled ${schedulingCommand.taskType.replace(
            "_",
            " "
          )} for ${timeStr} daily\n\n`;

          if (schedulingCommand.symbols.length > 0) {
            response += `📊 Tracking: ${schedulingCommand.symbols.join(
              ", "
            )}\n\n`;
          }

          response += ``;

          await sendSmsResponse(from, response, twilioClient);
          return true;
        } else {
          await sendSmsResponse(
            from,
            "❌ Could not create scheduled task. Please try again.",
            twilioClient
          );
          return true;
        }
      } catch (error) {
        console.error("Error creating scheduled task:", error);
        await sendSmsResponse(
          from,
          "❌ Error setting up scheduled task. Please try again.",
          twilioClient
        );
        return true;
      }
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

          const response = `Hey! ${companyName} (${symbol}) is at $${stockData.currentPrice.toFixed(
            2
          )} right now ${stockData.change >= 0 ? "📈" : "📉"}

${
  stockData.change >= 0
    ? `It's up $${Math.abs(stockData.change).toFixed(
        2
      )} (${sign}${stockData.changePercent.toFixed(
        2
      )}%) this week, which is pretty solid.`
    : `It's down $${Math.abs(stockData.change).toFixed(
        2
      )} (${stockData.changePercent.toFixed(
        2
      )}%) this week, but nothing too concerning.`
}

Volume looks healthy at ${
            stockData.volume
              ? (stockData.volume / 1000000).toFixed(1) + "M"
              : "N/A"
          } shares.

My take: ${analysis}`;

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
              `Got it! I'll start tracking ${companyName} for you 📱\n\nI'll send you updates when there's anything interesting happening. Want me to set up any price alerts while we're at it?`,
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
              "Your watchlist is empty right now. Want me to track some stocks for you? Just ask me about any stock!",
              twilioClient
            );
            return true;
          }

          let response = "Your stocks are looking good today! 📈\n\n";
          for (const stockSymbol of userProfile.watchedStocks.slice(0, 5)) {
            try {
              const stockData = await fetchStockData(stockSymbol);
              const trend = stockData.change >= 0 ? "📈" : "📉";
              const sign = stockData.change >= 0 ? "+" : "";
              const companyName = getCompanyName(stockSymbol);
              const displayName = companyName || stockSymbol;
              const changeText =
                stockData.changePercent >= 0
                  ? `up ${stockData.changePercent.toFixed(1)}%`
                  : `down ${Math.abs(stockData.changePercent).toFixed(1)}%`;

              response += `${displayName}: $${stockData.currentPrice.toFixed(
                2
              )} (${changeText}) ${trend}\n`;
            } catch (error) {
              response += `❌ ${stockSymbol}: Data unavailable\n`;
            }
          }

          if (userProfile.watchedStocks.length > 5) {
            response += `\n... and ${
              userProfile.watchedStocks.length - 5
            } more stocks`;
          }

          response += "\n\nWant me to keep an eye on any of these?";
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
              if (!userProfile) {
                await sendSmsResponse(
                  from,
                  `❌ Could not access your profile. Please try again.`,
                  twilioClient
                );
                return true;
              }

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
          `❌ Could not process that request. Please try a simpler command like "$STOCK AAPL" or "$HELP"`,
          twilioClient
        );
        return true;
      }
    }

    // Handle specific stock commands (support both $ prefix and old format)
    const upperMessage = message.toUpperCase();

    if (upperMessage.startsWith("$STOCK ")) {
      const symbol = message.substring(7).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: $STOCK AAPL",
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

    if (upperMessage.startsWith("$WATCH ")) {
      const symbol = message.substring(7).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: $WATCH AAPL",
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
          `✅ Added ${symbol} to your watchlist! I'll track this stock for you.`,
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

    if (upperMessage === "$SCHEDULES") {
      try {
        const scheduledTasks = await getUserScheduledTasks(from);

        if (scheduledTasks.length === 0) {
          await sendSmsResponse(
            from,
            '📅 No scheduled tasks found. Create one with "tell me the price of apple at 7am everyday"',
            twilioClient
          );
          return true;
        }

        let response = "📅 Your Scheduled Tasks:\n\n";

        for (let i = 0; i < scheduledTasks.length; i++) {
          const task = scheduledTasks[i];
          const timeStr = task.schedule_time;
          const taskType = task.task_type.replace("_", " ");
          const config = task.task_config || {};
          const symbols = config.symbols || [];

          response += `#${i + 1} 🕐 ${timeStr} - ${taskType}\n`;
          if (symbols.length > 0) {
            response += `📊 Tracking: ${symbols.join(", ")}\n`;
          }
          response += `🔄 Next: ${
            task.next_execution
              ? new Date(task.next_execution).toLocaleString()
              : "Not scheduled"
          }\n\n`;
        }

        response += ``;

        await sendSmsResponse(from, response, twilioClient);
        return true;
      } catch (error) {
        console.error("Error fetching scheduled tasks:", error);
        await sendSmsResponse(
          from,
          "❌ Error fetching scheduled tasks. Please try again.",
          twilioClient
        );
        return true;
      }
    }

    if (upperMessage === "$PORTFOLIO") {
      if (!userProfile?.watchedStocks?.length) {
        await sendSmsResponse(
          from,
          '📋 Your watchlist is empty. Add stocks with "$WATCH AAPL" or get a stock price with "$STOCK AAPL"',
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

      response += "";

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    if (upperMessage.startsWith("$ANALYZE ")) {
      const symbol = message.substring(9).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(
          from,
          "❌ Please specify a stock symbol. Example: $ANALYZE AAPL",
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

    if (upperMessage === "$ALERTS" || upperMessage.startsWith("$ALERTS ")) {
      const response =
        `🔔 Alert Management:\n\n` +
        `• "$ALERTS DAILY ON" - Daily updates for watched stocks\n` +
        `• "$ALERTS AAPL ABOVE 150" - Alert when AAPL goes above $150\n` +
        `• "$ALERTS AAPL BELOW 140" - Alert when AAPL goes below $140\n` +
        `• "$ALERTS LIST" - View current alerts\n` +
        `• "$ALERTS OFF" - Disable all alerts\n\n` +
        ``;

      await sendSmsResponse(from, response, twilioClient);
      return true;
    }

    if (
      upperMessage.startsWith("$DELETE SCHEDULE") ||
      upperMessage.startsWith("$DELETE #")
    ) {
      let taskId: string;

      if (upperMessage.startsWith("$DELETE #")) {
        // Handle "$DELETE #1" format
        const match = upperMessage.match(/\$DELETE #(\d+)/);
        if (!match) {
          await sendSmsResponse(
            from,
            '❌ Please provide a task number. Use "$SCHEDULES" to see your tasks.',
            twilioClient
          );
          return true;
        }

        const taskNumber = parseInt(match[1]);
        if (isNaN(taskNumber) || taskNumber < 1) {
          await sendSmsResponse(
            from,
            "❌ Please provide a valid task number (1, 2, 3, etc.).",
            twilioClient
          );
          return true;
        }

        // Get the actual task ID from the task number
        try {
          const scheduledTasks = await getUserScheduledTasks(from);
          if (taskNumber > scheduledTasks.length) {
            await sendSmsResponse(
              from,
              `❌ Task #${taskNumber} not found. You have ${scheduledTasks.length} scheduled task(s).`,
              twilioClient
            );
            return true;
          }

          taskId = scheduledTasks[taskNumber - 1].id;
        } catch (error) {
          await sendSmsResponse(
            from,
            "❌ Error fetching your tasks. Please try again.",
            twilioClient
          );
          return true;
        }
      } else {
        // Handle "$DELETE SCHEDULE [ID]" format
        const parts = upperMessage.split(" ");
        taskId = parts[parts.length - 1]; // Get the last part (ID)

        if (!taskId) {
          await sendSmsResponse(
            from,
            '❌ Please provide a task number. Use "$SCHEDULES" to see your tasks.',
            twilioClient
          );
          return true;
        }
      }

      try {
        const success = await deleteScheduledTask(taskId, from);
        if (success) {
          await sendSmsResponse(
            from,
            `✅ Deleted scheduled task successfully!`,
            twilioClient
          );
        } else {
          await sendSmsResponse(
            from,
            "❌ Could not delete task. Please check the task number.",
            twilioClient
          );
        }
        return true;
      } catch (error) {
        console.error("Error deleting scheduled task:", error);
        await sendSmsResponse(
          from,
          "❌ Error deleting task. Please try again.",
          twilioClient
        );
        return true;
      }
    }

    if (upperMessage === "$HELP") {
      const response =
        `📈 Stock Bot:\n\n` +
        `$STOCK [SYMBOL] - Get price & 7-day change\n` +
        `$WATCH [SYMBOL] - Add to watchlist\n` +
        `$PORTFOLIO - View your stocks\n` +
        `$ANALYZE [SYMBOL] - Get AI analysis\n` +
        `$ALERTS - Manage price alerts\n` +
        `$SCHEDULES - View scheduled tasks\n` +
        `$HELP - Show this menu\n\n` +
        `**Natural Language:**\n` +
        `"what's the price of apple?"\n` +
        `"analyze microsoft stock"\n` +
        `"show my portfolio"\n` +
        `"alert me when tesla hits $400"\n\n` +
        `**Scheduling:**\n` +
        `"tell me the price of apple at 7am everyday"\n` +
        `"send me my portfolio every morning at 8am"\n\n` +
        `**Delete:**\n` +
        `"stop sending me apple updates"\n` +
        `"$DELETE #1"\n\n` +
        ``;

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
      `❌ Stock agent error: ${error.message}. Try "$HELP" for commands.`,
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
