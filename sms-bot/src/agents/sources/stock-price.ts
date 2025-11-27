/**
 * Stock Price source fetcher
 * Fetches stock prices using Alpha Vantage API or Yahoo Finance
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface StockPriceConfig {
  symbols: string[]; // Array of stock ticker symbols (e.g., ['AAPL', 'GOOGL', 'TSLA'])
  maxItems?: number;
}

interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketTime: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
}

export async function fetchStockPrice(config: StockPriceConfig): Promise<NormalizedItem[]> {
  const {
    symbols,
    maxItems = 10,
  } = config;

  console.log(`📈 Fetching stock prices for ${symbols.join(', ')}...`);

  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (apiKey) {
      // Use Alpha Vantage if API key is available
      return await fetchFromAlphaVantage(symbols, maxItems, apiKey);
    } else {
      // Fall back to Yahoo Finance (no API key required)
      console.log('⚠️ ALPHA_VANTAGE_API_KEY not set, using Yahoo Finance API');
      return await fetchFromYahooFinance(symbols, maxItems);
    }

  } catch (error: any) {
    console.error('❌ Error fetching stock prices:', error.message);
    console.log('   Falling back to mock data...');
    return getMockStockData(symbols, maxItems);
  }
}

async function fetchFromAlphaVantage(
  symbols: string[],
  maxItems: number,
  apiKey: string
): Promise<NormalizedItem[]> {
  const normalized: NormalizedItem[] = [];

  // Alpha Vantage has rate limits (5 API calls per minute for free tier)
  // Fetch quotes sequentially to avoid rate limiting
  for (const symbol of symbols.slice(0, maxItems)) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apiKey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`⚠️ Alpha Vantage API error for ${symbol}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const quote: AlphaVantageQuote = data['Global Quote'];

      if (!quote || !quote['01. symbol']) {
        console.warn(`⚠️ No data returned for ${symbol}`);
        continue;
      }

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      const volume = parseInt(quote['06. volume'], 10);
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      const color = change > 0 ? '+' : '';

      normalized.push({
        id: `stock-${symbol}`,
        title: `${symbol} - $${price.toFixed(2)}`,
        summary: `Price: $${price.toFixed(2)} | Change: ${arrow} ${color}${change.toFixed(2)} (${color}${changePercent.toFixed(2)}%) | Volume: ${(volume / 1e6).toFixed(2)}M`,
        url: `https://www.google.com/finance/quote/${symbol}:NASDAQ`,
        publishedAt: new Date(quote['07. latest trading day']).toISOString(),
        author: 'Alpha Vantage',
        score: volume,
        raw: quote,
      });

      // Small delay to respect rate limits
      if (symbols.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 12000)); // 5 calls per minute = 12 seconds between calls
      }
    } catch (error: any) {
      console.warn(`⚠️ Error fetching ${symbol}:`, error.message);
    }
  }

  console.log(`✅ Fetched ${normalized.length} stock prices from Alpha Vantage`);
  return normalized;
}

async function fetchFromYahooFinance(
  symbols: string[],
  maxItems: number
): Promise<NormalizedItem[]> {
  // Yahoo Finance v8 API endpoint (unofficial but widely used)
  const symbolsParam = symbols.slice(0, maxItems).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.statusText}`);
  }

  const data = await response.json();
  const quotes: YahooFinanceQuote[] = data.quoteResponse?.result || [];

  const normalized: NormalizedItem[] = quotes.map(quote => {
    const price = quote.regularMarketPrice || 0;
    const change = quote.regularMarketChange || 0;
    const changePercent = quote.regularMarketChangePercent || 0;
    const volume = quote.regularMarketVolume || 0;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const color = change > 0 ? '+' : '';

    return {
      id: `stock-${quote.symbol}`,
      title: `${quote.symbol} - $${price.toFixed(2)}`,
      summary: `Price: $${price.toFixed(2)} | Change: ${arrow} ${color}${change.toFixed(2)} (${color}${changePercent.toFixed(2)}%) | Volume: ${(volume / 1e6).toFixed(2)}M`,
      url: `https://finance.yahoo.com/quote/${quote.symbol}`,
      publishedAt: new Date(quote.regularMarketTime * 1000).toISOString(),
      author: 'Yahoo Finance',
      score: volume,
      raw: quote,
    };
  });

  console.log(`✅ Fetched ${normalized.length} stock prices from Yahoo Finance`);
  return normalized;
}

function getMockStockData(symbols: string[], maxItems: number): NormalizedItem[] {
  const mockStocks = symbols.slice(0, maxItems).map((symbol, index) => {
    const basePrice = 100 + Math.random() * 400;
    const change = (Math.random() - 0.5) * 20;
    const changePercent = (change / basePrice) * 100;
    const volume = Math.floor(Math.random() * 100) * 1e6;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const color = change > 0 ? '+' : '';

    return {
      id: `stock-mock-${symbol}`,
      title: `${symbol} - $${basePrice.toFixed(2)}`,
      summary: `Price: $${basePrice.toFixed(2)} | Change: ${arrow} ${color}${change.toFixed(2)} (${color}${changePercent.toFixed(2)}%) | Volume: ${(volume / 1e6).toFixed(2)}M`,
      url: `https://www.google.com/finance/quote/${symbol}:NASDAQ`,
      publishedAt: new Date().toISOString(),
      author: 'Mock Data',
      score: volume,
    };
  });

  return mockStocks;
}
