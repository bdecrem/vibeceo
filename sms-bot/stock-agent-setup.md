# Stock Agent Setup Guide

## 🚀 Quick Start

The agentic stock bot is now integrated into the VibeCEO SMS system! Here's how to set it up and use it.

## 📋 Prerequisites

### 1. Environment Variables
Add these to your `.env` file:

```bash
# Stock API Configuration
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Existing Twilio Configuration (should already be set)
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

### 2. Database Setup
Run the database migration to create the stock agent tables:

```bash
# Navigate to sms-bot directory
cd sms-bot

# Run the migration (adjust path to your Supabase setup)
psql -h your-supabase-host -U postgres -d postgres -f migrations/stock_agent_schema.sql
```

## 🎯 Stock Agent Commands

Users can now text these commands to your SMS number:

### Basic Commands
- **`STOCK AAPL`** - Get current price and 7-day movement
- **`WATCH TSLA`** - Add Tesla to your watchlist
- **`PORTFOLIO`** - View all your watched stocks
- **`ANALYZE MSFT`** - Get AI analysis of Microsoft
- **`ALERTS`** - Manage price alerts
- **`HELP`** - Show all available commands

### Alert Commands
- **`ALERTS DAILY ON`** - Enable daily updates for watched stocks
- **`ALERTS AAPL ABOVE 150`** - Alert when AAPL goes above $150
- **`ALERTS TSLA BELOW 200`** - Alert when TSLA goes below $200
- **`ALERTS LIST`** - View current alerts
- **`ALERTS OFF`** - Disable all alerts

### Conversational AI
The bot also responds to natural language:
- "What stocks should I buy?"
- "How is the market doing?"
- "Tell me about Apple stock"
- "What's trending in tech stocks?"

## 🔧 Testing

### 1. Test the Stock Agent
```bash
cd sms-bot
node test-stock-agent.js
```

### 2. Test with Real SMS
1. Start the SMS bot: `npm run start`
2. Text your Twilio number: `STOCK AAPL`
3. You should receive a stock update!

## 📊 Features

### 🤖 Agentic Capabilities
- **Memory**: Remembers your stock preferences and watchlist
- **Context Awareness**: Understands follow-up questions
- **Proactive Suggestions**: Suggests relevant actions
- **Personality**: Conversational and educational tone

### 📈 Stock Data
- **Real-time Prices**: Current stock prices
- **7-Day Movement**: Price change over the past week
- **Volume Data**: Trading volume information
- **AI Analysis**: Intelligent market insights

### 🔔 Alert System
- **Daily Updates**: Scheduled daily summaries
- **Price Thresholds**: Alerts when stocks hit target prices
- **Volatility Alerts**: Notifications for significant price movements
- **Smart Delivery**: Optimized timing for maximum impact

## 🏗️ Architecture

### Core Components
1. **`stock-agent.ts`** - Main conversation handler
2. **`stock-api.ts`** - Stock data fetching with fallbacks
3. **`stock-alerts.ts`** - Alert system and scheduling
4. **Database Schema** - User profiles and alert storage

### Data Flow
```
SMS → handlers.ts → stock-agent.ts → stock-api.ts → Alpha Vantage API
                ↓
            Database (Supabase) ← stock-alerts.ts
```

## 🚀 Deployment

### 1. Database Migration
```bash
# Run the migration in your Supabase dashboard or via CLI
psql -f migrations/stock_agent_schema.sql
```

### 2. Environment Setup
```bash
# Add your Alpha Vantage API key
export ALPHA_VANTAGE_API_KEY=your_key_here
```

### 3. Start the Service
```bash
# The stock agent is automatically integrated
npm run start
```

## 📱 Usage Examples

### Example Conversation
```
User: STOCK AAPL
Bot: 📈 AAPL Stock Update
     💰 Current: $150.25
     📊 7-Day: +$2.15 (+1.45%)
     📈 Volume: 45,234,567
     🤖 Analysis: Apple shows strong momentum with recent iPhone sales driving growth...
     💡 Commands: "WATCH AAPL", "ANALYZE AAPL", "ALERTS"

User: WATCH AAPL
Bot: ✅ Added AAPL to your watchlist! I'll track this stock for you.
     💡 Set alerts with "ALERTS AAPL" or get updates with "PORTFOLIO"

User: ALERTS AAPL ABOVE 160
Bot: 🔔 Price alert set! I'll notify you when AAPL goes above $160.00
```

## 🔧 Troubleshooting

### Common Issues

1. **"API rate limit exceeded"**
   - Alpha Vantage has rate limits
   - The system includes fallback APIs
   - Consider upgrading your Alpha Vantage plan

2. **"Stock data unavailable"**
   - Check your Alpha Vantage API key
   - Verify the stock symbol is valid
   - The system will try multiple data sources

3. **Database errors**
   - Ensure Supabase connection is configured
   - Run the database migration
   - Check table permissions

### Debug Mode
```bash
# Enable debug logging
DEBUG=stock-agent npm run start
```

## 📈 Monitoring

### Alert Processing
The system processes alerts automatically. To manually trigger:
```bash
# Process all pending alerts
node -e "
import('./lib/sms/stock-alerts.js').then(async ({ processAllAlerts }) => {
  // You'll need to provide a Twilio client
  await processAllAlerts(mockTwilioClient);
});
"
```

### Database Queries
```sql
-- Check user profiles
SELECT * FROM user_stock_profiles;

-- Check active alerts
SELECT * FROM stock_alerts WHERE is_active = true;

-- Check stock price history
SELECT * FROM stock_price_history ORDER BY timestamp DESC LIMIT 10;
```

## 🎉 Success!

Your agentic stock bot is now ready! Users can text stock commands to your SMS number and receive intelligent, personalized stock market assistance.

The bot will:
- ✅ Remember user preferences
- ✅ Provide real-time stock data
- ✅ Set up price alerts
- ✅ Deliver daily updates
- ✅ Offer AI-powered analysis
- ✅ Maintain conversational context

Happy trading! 📈🚀
