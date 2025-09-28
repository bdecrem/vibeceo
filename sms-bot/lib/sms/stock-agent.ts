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

import { generateAiResponse } from './ai.js';
import { sendSmsResponse } from './handlers.js';
import type { TwilioClient } from './webhooks.js';
import { supabase } from '../supabase.js';
import { getStockData as fetchStockData, type StockData } from './stock-api.js';

// Types for stock agent (re-exported from stock-api)
export type { StockData } from './stock-api.js';

export interface UserStockProfile {
  phoneNumber: string;
  watchedStocks: string[];
  alertPreferences: {
    dailyUpdates: boolean;
    priceThresholds: { [symbol: string]: { above?: number; below?: number } };
    volatilityAlerts: boolean;
  };
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredSectors: string[];
  lastInteraction: string;
}

export interface StockAlert {
  id: string;
  phoneNumber: string;
  symbol: string;
  alertType: 'daily' | 'price_above' | 'price_below' | 'volatility';
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
        role: 'system', 
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

Always be helpful and educational while staying in character as a knowledgeable financial advisor.` 
      }
    ]);
  }
  
  return stockConversationStore.get(phoneNumber) || [];
}

/**
 * Save stock conversation history for a user
 */
export function saveStockConversationHistory(phoneNumber: string, history: any[]): void {
  // Trim conversation to prevent unlimited growth
  const maxMessages = 20;
  if (history.length > maxMessages) {
    const systemMessage = history.find(msg => msg.role === 'system');
    const recentMessages = history.slice(-maxMessages);
    
    if (systemMessage && !recentMessages.some(msg => msg.role === 'system')) {
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
export async function getUserStockProfile(phoneNumber: string): Promise<UserStockProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_stock_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('Error fetching user stock profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserStockProfile:', error);
    return null;
  }
}

/**
 * Save user stock profile to database
 */
export async function saveUserStockProfile(phoneNumber: string, profile: Partial<UserStockProfile>): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_stock_profiles')
      .upsert({
        phone_number: phoneNumber,
        ...profile,
        last_interaction: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving user stock profile:', error);
    }
  } catch (error) {
    console.error('Error in saveUserStockProfile:', error);
  }
}

/**
 * Get stock data from Alpha Vantage API
 */
export async function getStockData(symbol: string): Promise<StockData> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Invalid stock symbol: ${symbol}`);
    }
    
    if (data['Note']) {
      throw new Error('API rate limit exceeded. Please try again later.');
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
      symbol: symbol.toUpperCase(),
      currentPrice,
      weekAgoPrice,
      change,
      changePercent,
      volume: parseInt(current['5. volume']),
      timestamp: new Date().toISOString(),
      source: 'alpha_vantage' as const
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw new Error(`Failed to fetch stock data for ${symbol}: ${error.message}`);
  }
}

/**
 * Generate AI analysis for stock data
 */
export async function generateStockAnalysis(stockData: StockData, userContext: string = ''): Promise<string> {
  const analysisPrompt = `
Analyze this stock data for a user who said: "${userContext}"

Stock: ${stockData.symbol}
Current Price: $${stockData.currentPrice.toFixed(2)}
7-Day Change: ${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%
Volume: ${stockData.volume?.toLocaleString() || 'N/A'}

Provide a brief, helpful analysis including:
1. Market sentiment (bullish/bearish/neutral)
2. Key factors affecting the stock
3. Simple recommendation (buy/hold/watch)
4. Risk level assessment (low/medium/high)

Keep it conversational and under 200 characters for SMS.
`;

  try {
    const analysis = await generateAiResponse([
      { role: 'system', content: 'You are a financial analyst. Provide concise, helpful stock analysis in a conversational tone.' },
      { role: 'user', content: analysisPrompt }
    ]);
    
    return analysis;
  } catch (error) {
    console.error('Error generating stock analysis:', error);
    return 'Analysis temporarily unavailable.';
  }
}

/**
 * Format stock data for SMS response
 */
export function formatStockResponse(stockData: StockData, analysis?: string, userProfile?: UserStockProfile): string {
  const trend = stockData.change >= 0 ? '📈' : '📉';
  const sign = stockData.change >= 0 ? '+' : '';
  
  let response = `${trend} ${stockData.symbol} Stock Update\n\n`;
  response += `💰 Current: $${stockData.currentPrice.toFixed(2)}\n`;
  response += `📊 7-Day: ${sign}$${stockData.change.toFixed(2)} (${sign}${stockData.changePercent.toFixed(2)}%)\n`;
  
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
  console.log('📈 === STOCK AGENT CONVERSATION START ===');
  console.log('Input:', { message, from });
  
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
      
      const enhancedHistory = conversationHistory.map(msg => 
        msg.role === 'system' ? { ...msg, content: enhancedPrompt } : msg
      );
      
      enhancedHistory.push({ role: 'user', content: message });
      
      const response = await generateAiResponse(enhancedHistory);
      saveStockConversationHistory(from, enhancedHistory);
      await sendSmsResponse(from, response, twilioClient);
      
      return true;
    }
    
    // Handle specific stock commands
    const upperMessage = message.toUpperCase();
    
    if (upperMessage.startsWith('STOCK ')) {
      const symbol = message.substring(6).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(from, '❌ Please specify a stock symbol. Example: STOCK AAPL', twilioClient);
        return true;
      }
      
      const stockData = await fetchStockData(symbol);
      const analysis = await generateStockAnalysis(stockData, message);
      const response = formatStockResponse(stockData, analysis, userProfile);
      
      await sendSmsResponse(from, response, twilioClient);
      
      // Update conversation history
      conversationHistory.push({ role: 'user', content: message });
      conversationHistory.push({ role: 'assistant', content: response });
      saveStockConversationHistory(from, conversationHistory);
      
      return true;
    }
    
    if (upperMessage.startsWith('WATCH ')) {
      const symbol = message.substring(6).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(from, '❌ Please specify a stock symbol. Example: WATCH AAPL', twilioClient);
        return true;
      }
      
      // Add to watchlist
      const currentProfile = userProfile || {
        phoneNumber: from,
        watchedStocks: [],
        alertPreferences: { dailyUpdates: false, priceThresholds: {}, volatilityAlerts: false },
        riskTolerance: 'moderate' as const,
        preferredSectors: [],
        lastInteraction: new Date().toISOString()
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
        await sendSmsResponse(from, `📋 ${symbol} is already in your watchlist!`, twilioClient);
      }
      
      return true;
    }
    
    if (upperMessage === 'PORTFOLIO') {
      if (!userProfile?.watchedStocks?.length) {
        await sendSmsResponse(
          from, 
          '📋 Your watchlist is empty. Add stocks with "WATCH AAPL" or get a stock price with "STOCK AAPL"', 
          twilioClient
        );
        return true;
      }
      
      let response = '📋 Your Stock Watchlist:\n\n';
      
      for (const symbol of userProfile.watchedStocks.slice(0, 5)) { // Limit to 5 for SMS
        try {
          const stockData = await fetchStockData(symbol);
          const trend = stockData.change >= 0 ? '📈' : '📉';
          const sign = stockData.change >= 0 ? '+' : '';
          
          response += `${trend} ${symbol}: $${stockData.currentPrice.toFixed(2)} (${sign}${stockData.changePercent.toFixed(2)}%)\n`;
        } catch (error) {
          response += `❌ ${symbol}: Data unavailable\n`;
        }
      }
      
      if (userProfile.watchedStocks.length > 5) {
        response += `\n... and ${userProfile.watchedStocks.length - 5} more stocks`;
      }
      
      response += '\n\n💡 Use "STOCK [SYMBOL]" for detailed analysis';
      
      await sendSmsResponse(from, response, twilioClient);
      return true;
    }
    
    if (upperMessage.startsWith('ANALYZE ')) {
      const symbol = message.substring(8).trim().toUpperCase();
      if (!symbol) {
        await sendSmsResponse(from, '❌ Please specify a stock symbol. Example: ANALYZE AAPL', twilioClient);
        return true;
      }
      
      const stockData = await fetchStockData(symbol);
      const analysis = await generateStockAnalysis(stockData, message);
      const response = formatStockResponse(stockData, analysis, userProfile);
      
      await sendSmsResponse(from, response, twilioClient);
      return true;
    }
    
    if (upperMessage === 'ALERTS' || upperMessage.startsWith('ALERTS ')) {
      const response = `🔔 Alert Management:\n\n` +
        `• "ALERTS DAILY ON" - Daily updates for watched stocks\n` +
        `• "ALERTS AAPL ABOVE 150" - Alert when AAPL goes above $150\n` +
        `• "ALERTS AAPL BELOW 140" - Alert when AAPL goes below $140\n` +
        `• "ALERTS LIST" - View current alerts\n` +
        `• "ALERTS OFF" - Disable all alerts\n\n` +
        `💡 I'll send you SMS alerts when conditions are met!`;
      
      await sendSmsResponse(from, response, twilioClient);
      return true;
    }
    
    if (upperMessage === 'HELP') {
      const response = `📈 Stock Bot Commands:\n\n` +
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
    conversationHistory.push({ role: 'user', content: message });
    
    const response = await generateAiResponse(conversationHistory);
    
    conversationHistory.push({ role: 'assistant', content: response });
    saveStockConversationHistory(from, conversationHistory);
    
    await sendSmsResponse(from, response, twilioClient);
    
    return true;
    
  } catch (error) {
    console.error('Error in stock agent:', error);
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

