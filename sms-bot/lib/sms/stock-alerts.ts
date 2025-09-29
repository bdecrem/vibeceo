/**
 * Stock Alerts System - Scheduled Notifications and Threshold Monitoring
 * 
 * Features:
 * - Daily stock updates
 * - Price threshold alerts (above/below)
 * - Volatility alerts
 * - Scheduled delivery
 * - Alert management
 */

import { supabase } from '../supabase.js';
import { getStockData, type StockData } from './stock-api.js';
import { generateAiResponse } from './ai.js';
import type { TwilioClient } from './webhooks.js';

export interface StockAlert {
  id: string;
  phoneNumber: string;
  symbol: string;
  alertType: 'daily' | 'price_above' | 'price_below' | 'volatility';
  threshold?: number;
  isActive: boolean;
  createdAt: string;
}

export interface AlertTrigger {
  phoneNumber: string;
  symbol: string;
  alertType: string;
  currentPrice: number;
  threshold?: number;
  message: string;
}

// In-memory store for active alerts (in production, this would be in Redis)
const activeAlerts = new Map<string, StockAlert[]>();

/**
 * Initialize alerts system
 */
export async function initializeAlertsSystem(): Promise<void> {
  console.log('🔔 Initializing stock alerts system...');
  
  try {
    // Load active alerts from database
    const { data: alerts, error } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading alerts:', error);
      return;
    }
    
    // Group alerts by phone number
    const alertsByPhone = new Map<string, StockAlert[]>();
    
    alerts?.forEach(alert => {
      const phone = alert.phone_number;
      if (!alertsByPhone.has(phone)) {
        alertsByPhone.set(phone, []);
      }
      alertsByPhone.get(phone)!.push(alert);
    });
    
    // Store in memory
    alertsByPhone.forEach((alerts, phone) => {
      activeAlerts.set(phone, alerts);
    });
    
    console.log(`🔔 Loaded ${alerts?.length || 0} active alerts for ${alertsByPhone.size} users`);
    
  } catch (error) {
    console.error('Error initializing alerts system:', error);
  }
}

/**
 * Create a new stock alert
 */
export async function createStockAlert(
  phoneNumber: string,
  symbol: string,
  alertType: 'daily' | 'price_above' | 'price_below' | 'volatility',
  threshold?: number
): Promise<StockAlert> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .insert({
        phone_number: phoneNumber,
        symbol: symbol.toUpperCase(),
        alert_type: alertType,
        threshold: threshold,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`);
    }
    
    // Add to in-memory store
    if (!activeAlerts.has(phoneNumber)) {
      activeAlerts.set(phoneNumber, []);
    }
    activeAlerts.get(phoneNumber)!.push(data);
    
    console.log(`🔔 Created ${alertType} alert for ${symbol} (${phoneNumber})`);
    return data;
    
  } catch (error) {
    console.error('Error creating stock alert:', error);
    throw error;
  }
}

/**
 * Delete a stock alert
 */
export async function deleteStockAlert(phoneNumber: string, alertId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('stock_alerts')
      .update({ is_active: false })
      .eq('id', alertId)
      .eq('phone_number', phoneNumber);
    
    if (error) {
      throw new Error(`Failed to delete alert: ${error.message}`);
    }
    
    // Remove from in-memory store
    const userAlerts = activeAlerts.get(phoneNumber) || [];
    const updatedAlerts = userAlerts.filter(alert => alert.id !== alertId);
    activeAlerts.set(phoneNumber, updatedAlerts);
    
    console.log(`🔔 Deleted alert ${alertId} for ${phoneNumber}`);
    
  } catch (error) {
    console.error('Error deleting stock alert:', error);
    throw error;
  }
}

/**
 * Get user's active alerts
 */
export async function getUserAlerts(phoneNumber: string): Promise<StockAlert[]> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user alerts:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Error in getUserAlerts:', error);
    return [];
  }
}

/**
 * Process daily alerts for all users
 */
export async function processDailyAlerts(twilioClient: TwilioClient): Promise<void> {
  console.log('🔔 Processing daily alerts...');
  
  try {
    // Get all users with daily alerts
    const { data: dailyAlerts, error } = await supabase
      .from('stock_alerts')
      .select('phone_number, symbol')
      .eq('alert_type', 'daily')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching daily alerts:', error);
      return;
    }
    
    if (!dailyAlerts?.length) {
      console.log('🔔 No daily alerts to process');
      return;
    }
    
    // Group by phone number
    const alertsByPhone = new Map<string, string[]>();
    dailyAlerts.forEach(alert => {
      const phone = alert.phone_number;
      if (!alertsByPhone.has(phone)) {
        alertsByPhone.set(phone, []);
      }
      alertsByPhone.get(phone)!.push(alert.symbol);
    });
    
    // Process each user's daily update
    for (const [phoneNumber, symbols] of alertsByPhone) {
      try {
        await sendDailyUpdate(phoneNumber, symbols, twilioClient);
      } catch (error) {
        console.error(`Error sending daily update to ${phoneNumber}:`, error);
      }
    }
    
    console.log(`🔔 Processed daily alerts for ${alertsByPhone.size} users`);
    
  } catch (error) {
    console.error('Error processing daily alerts:', error);
  }
}

/**
 * Send daily stock update to a user
 */
async function sendDailyUpdate(
  phoneNumber: string, 
  symbols: string[], 
  twilioClient: TwilioClient
): Promise<void> {
  try {
    let message = `📈 Daily Stock Update\n\n`;
    
    // Get stock data for all symbols
    const stockDataPromises = symbols.map(symbol => 
      getStockData(symbol).catch(error => {
        console.warn(`Failed to get data for ${symbol}:`, error);
        return null;
      })
    );
    
    const stockDataList = await Promise.all(stockDataPromises);
    const validStockData = stockDataList.filter(Boolean) as StockData[];
    
    if (validStockData.length === 0) {
      message += `❌ Unable to fetch stock data at this time.`;
    } else {
      // Format stock data
      validStockData.forEach(stock => {
        const trend = stock.change >= 0 ? '📈' : '📉';
        const sign = stock.change >= 0 ? '+' : '';
        
        message += `${trend} ${stock.symbol}: $${stock.currentPrice.toFixed(2)} (${sign}${stock.changePercent.toFixed(2)}%)\n`;
      });
      
      // Add market analysis
      const totalChange = validStockData.reduce((sum, stock) => sum + stock.changePercent, 0);
      const avgChange = totalChange / validStockData.length;
      
      if (avgChange > 2) {
        message += `\n🚀 Strong day! Your portfolio is up ${avgChange.toFixed(1)}% on average.`;
      } else if (avgChange < -2) {
        message += `\n📉 Tough day. Your portfolio is down ${Math.abs(avgChange).toFixed(1)}% on average.`;
      } else {
        message += `\n📊 Mixed day. Your portfolio is ${avgChange >= 0 ? 'up' : 'down'} ${Math.abs(avgChange).toFixed(1)}% on average.`;
      }
    }
    
    message += `\n\n💡 Reply "PORTFOLIO" for full details or "ALERTS" to manage alerts`;
    
    // Send SMS
    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
    });
    
    console.log(`📱 Daily update sent to ${phoneNumber}`);
    
  } catch (error) {
    console.error(`Error sending daily update to ${phoneNumber}:`, error);
  }
}

/**
 * Check price threshold alerts
 */
export async function checkPriceThresholds(twilioClient: TwilioClient): Promise<void> {
  console.log('🔔 Checking price thresholds...');
  
  try {
    // Get all price threshold alerts
    const { data: priceAlerts, error } = await supabase
      .from('stock_alerts')
      .select('*')
      .in('alert_type', ['price_above', 'price_below'])
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching price alerts:', error);
      return;
    }
    
    if (!priceAlerts?.length) {
      console.log('🔔 No price threshold alerts to check');
      return;
    }
    
    // Group by symbol to minimize API calls
    const alertsBySymbol = new Map<string, any[]>();
    priceAlerts.forEach(alert => {
      const symbol = alert.symbol;
      if (!alertsBySymbol.has(symbol)) {
        alertsBySymbol.set(symbol, []);
      }
      alertsBySymbol.get(symbol)!.push(alert);
    });
    
    // Check each symbol
    for (const [symbol, alerts] of alertsBySymbol) {
      try {
        const stockData = await getStockData(symbol);
        const currentPrice = stockData.currentPrice;
        
        // Check each alert for this symbol
        for (const alert of alerts) {
          const shouldTrigger = 
            (alert.alert_type === 'price_above' && currentPrice >= alert.threshold) ||
            (alert.alert_type === 'price_below' && currentPrice <= alert.threshold);
          
          if (shouldTrigger) {
            await sendPriceAlert(alert, currentPrice, twilioClient);
            
            // Deactivate the alert after triggering
            await deleteStockAlert(alert.phone_number, alert.id);
          }
        }
      } catch (error) {
        console.warn(`Error checking alerts for ${symbol}:`, error);
      }
    }
    
    console.log(`🔔 Checked price thresholds for ${alertsBySymbol.size} symbols`);
    
  } catch (error) {
    console.error('Error checking price thresholds:', error);
  }
}

/**
 * Send price threshold alert
 */
async function sendPriceAlert(
  alert: any, 
  currentPrice: number, 
  twilioClient: TwilioClient
): Promise<void> {
  try {
    const direction = alert.alert_type === 'price_above' ? 'above' : 'below';
    const trend = alert.alert_type === 'price_above' ? '🚀' : '📉';
    
    const message = `${trend} Price Alert Triggered!\n\n` +
      `${alert.symbol} is now $${currentPrice.toFixed(2)} (${direction} $${alert.threshold})\n\n` +
      `This alert has been automatically removed.\n\n` +
      `💡 Set new alerts with "ALERTS ${alert.symbol} ABOVE/BELOW [PRICE]"`;
    
    await twilioClient.messages.create({
      body: message,
      to: alert.phone_number,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
    });
    
    console.log(`🔔 Price alert sent to ${alert.phone_number} for ${alert.symbol}`);
    
  } catch (error) {
    console.error(`Error sending price alert:`, error);
  }
}

/**
 * Process all alerts (daily + thresholds)
 */
export async function processAllAlerts(twilioClient: TwilioClient): Promise<void> {
  console.log('🔔 Processing all stock alerts...');
  
  try {
    // Process daily alerts
    await processDailyAlerts(twilioClient);
    
    // Check price thresholds
    await checkPriceThresholds(twilioClient);
    
    console.log('🔔 All alerts processed');
    
  } catch (error) {
    console.error('Error processing all alerts:', error);
  }
}

/**
 * Schedule alerts processing (call this from a cron job)
 */
export async function scheduleAlertsProcessing(twilioClient: TwilioClient): Promise<void> {
  // This would typically be called by a cron job or scheduler
  // For now, we'll just process immediately
  await processAllAlerts(twilioClient);
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<{
  totalAlerts: number;
  dailyAlerts: number;
  priceAlerts: number;
  activeUsers: number;
}> {
  try {
    const { data: alerts, error } = await supabase
      .from('stock_alerts')
      .select('alert_type, phone_number')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching alert stats:', error);
      return { totalAlerts: 0, dailyAlerts: 0, priceAlerts: 0, activeUsers: 0 };
    }
    
    const totalAlerts = alerts?.length || 0;
    const dailyAlerts = alerts?.filter(a => a.alert_type === 'daily').length || 0;
    const priceAlerts = alerts?.filter(a => a.alert_type.includes('price')).length || 0;
    const activeUsers = new Set(alerts?.map(a => a.phone_number)).size;
    
    return { totalAlerts, dailyAlerts, priceAlerts, activeUsers };
    
  } catch (error) {
    console.error('Error getting alert stats:', error);
    return { totalAlerts: 0, dailyAlerts: 0, priceAlerts: 0, activeUsers: 0 };
  }
}
