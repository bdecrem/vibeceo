/**
 * Stock API Integration - Multiple Data Sources with Fallbacks
 * 
 * Supports:
 * - Alpha Vantage (primary)
 * - Yahoo Finance (fallback)
 * - Mock data for testing
 * - Rate limiting and caching
 */

import { supabase } from '../supabase.js';

export interface StockData {
  symbol: string;
  currentPrice: number;
  weekAgoPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  timestamp: string;
  source: 'alpha_vantage' | 'yahoo_finance' | 'mock' | 'cached';
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  timestamp: string;
}

// Cache for stock data (in-memory, 5 minute TTL)
const stockCache = new Map<string, { data: StockData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get stock data with caching and multiple fallbacks
 */
export async function getStockData(symbol: string): Promise<StockData> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check cache first
  const cached = stockCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📊 Using cached data for ${upperSymbol}`);
    return cached.data;
  }
  
  console.log(`📊 Fetching fresh data for ${upperSymbol}`);
  
  // Try multiple data sources
  const sources = [
    () => getAlphaVantageData(upperSymbol),
    () => getYahooFinanceData(upperSymbol),
    () => getMockStockData(upperSymbol)
  ];
  
  for (const source of sources) {
    try {
      const data = await source();
      if (data) {
        // Cache the result
        stockCache.set(upperSymbol, { data, timestamp: Date.now() });
        
        // Store in database for historical tracking
        await storeStockPriceHistory(data);
        
        return data;
      }
    } catch (error) {
      console.warn(`Stock data source failed for ${upperSymbol}:`, error.message);
      continue;
    }
  }
  
  throw new Error(`Unable to fetch stock data for ${upperSymbol} from any source`);
}

/**
 * Alpha Vantage API integration
 */
async function getAlphaVantageData(symbol: string): Promise<StockData | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }
  
  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`
  );
  
  const data = await response.json();
  
  if (data['Error Message']) {
    throw new Error(`Invalid stock symbol: ${symbol}`);
  }
  
  if (data['Note']) {
    throw new Error('API rate limit exceeded');
  }
  
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error(`No data available for ${symbol}`);
  }
  
  const dates = Object.keys(timeSeries).sort().reverse();
  const current = timeSeries[dates[0]];
  const weekAgo = timeSeries[dates[6]] || timeSeries[dates[dates.length - 1]];
  
  const currentPrice = parseFloat(current['4. close']);
  const weekAgoPrice = parseFloat(weekAgo['4. close']);
  const change = currentPrice - weekAgoPrice;
  const changePercent = (change / weekAgoPrice) * 100;
  
  return {
    symbol,
    currentPrice,
    weekAgoPrice,
    change,
    changePercent,
    volume: parseInt(current['5. volume']),
    timestamp: new Date().toISOString(),
    source: 'alpha_vantage'
  };
}

/**
 * Yahoo Finance API integration (fallback)
 */
async function getYahooFinanceData(symbol: string): Promise<StockData | null> {
  try {
    // Using a public Yahoo Finance API endpoint
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`
    );
    
    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('No data from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    return {
      symbol,
      currentPrice,
      weekAgoPrice: previousClose,
      change,
      changePercent,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      timestamp: new Date().toISOString(),
      source: 'yahoo_finance'
    };
  } catch (error) {
    throw new Error(`Yahoo Finance API error: ${error.message}`);
  }
}

/**
 * Mock stock data for testing
 */
async function getMockStockData(symbol: string): Promise<StockData | null> {
  // Only use mock data in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock data not available in production');
  }
  
  console.log(`🎭 Using mock data for ${symbol}`);
  
  // Generate realistic mock data
  const basePrice = 100 + (symbol.charCodeAt(0) * 10) % 500;
  const volatility = 0.02; // 2% daily volatility
  const change = (Math.random() - 0.5) * basePrice * volatility;
  const currentPrice = basePrice + change;
  const weekAgoPrice = basePrice;
  
  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    weekAgoPrice,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round((change / weekAgoPrice) * 10000) / 100,
    volume: Math.floor(Math.random() * 10000000) + 1000000,
    marketCap: Math.floor(currentPrice * 1000000000),
    timestamp: new Date().toISOString(),
    source: 'mock'
  };
}

/**
 * Store stock price in database for historical tracking
 */
async function storeStockPriceHistory(stockData: StockData): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_price_history')
      .insert({
        symbol: stockData.symbol,
        price: stockData.currentPrice,
        volume: stockData.volume,
        timestamp: stockData.timestamp
      });
    
    if (error) {
      console.warn('Failed to store stock price history:', error);
    }
  } catch (error) {
    console.warn('Error storing stock price history:', error);
  }
}

/**
 * Get multiple stock quotes at once
 */
export async function getMultipleStockData(symbols: string[]): Promise<StockData[]> {
  const promises = symbols.map(symbol => 
    getStockData(symbol).catch(error => {
      console.error(`Failed to fetch ${symbol}:`, error);
      return null;
    })
  );
  
  const results = await Promise.all(promises);
  return results.filter(Boolean) as StockData[];
}

/**
 * Get stock data with retry logic
 */
export async function getStockDataWithRetry(symbol: string, maxRetries: number = 3): Promise<StockData> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getStockData(symbol);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed for ${symbol}:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Clear stock data cache
 */
export function clearStockCache(symbol?: string): void {
  if (symbol) {
    stockCache.delete(symbol.toUpperCase());
  } else {
    stockCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: stockCache.size,
    entries: Array.from(stockCache.keys())
  };
}

/**
 * Validate stock symbol format
 */
export function isValidStockSymbol(symbol: string): boolean {
  // Basic validation - 1-5 uppercase letters
  return /^[A-Z]{1,5}$/.test(symbol.toUpperCase());
}

/**
 * Get popular stock symbols for suggestions
 */
export function getPopularStocks(): string[] {
  return [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
    'SPY', 'QQQ', 'VTI', 'ARKK', 'GME', 'AMC', 'BB', 'PLTR', 'ROKU', 'ZOOM'
  ];
}

/**
 * Search for stock symbols by company name
 */
export async function searchStockSymbols(query: string): Promise<string[]> {
  // This would typically use a stock search API
  // For now, return popular stocks that match the query
  const popular = getPopularStocks();
  const queryUpper = query.toUpperCase();
  
  return popular.filter(symbol => 
    symbol.includes(queryUpper) || 
    // Add some basic company name matching
    (queryUpper.includes('APPLE') && symbol === 'AAPL') ||
    (queryUpper.includes('MICROSOFT') && symbol === 'MSFT') ||
    (queryUpper.includes('GOOGLE') && symbol === 'GOOGL') ||
    (queryUpper.includes('AMAZON') && symbol === 'AMZN') ||
    (queryUpper.includes('TESLA') && symbol === 'TSLA')
  );
}
