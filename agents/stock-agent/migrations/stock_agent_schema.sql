-- Stock Agent Database Schema
-- Creates tables for user stock profiles, watchlists, and alerts

-- User stock profiles table
CREATE TABLE IF NOT EXISTS user_stock_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    watched_stocks TEXT[] DEFAULT '{}',
    alert_preferences JSONB DEFAULT '{
        "dailyUpdates": false,
        "priceThresholds": {},
        "volatilityAlerts": false
    }',
    risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    preferred_sectors TEXT[] DEFAULT '{}',
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('daily', 'price_above', 'price_below', 'volatility')),
    threshold DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations
    UNIQUE(phone_number, symbol, alert_type, threshold)
);

-- Stock price history table (for tracking and analysis)
CREATE TABLE IF NOT EXISTS stock_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    volume BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stock_profiles_phone ON user_stock_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_phone ON stock_alerts(phone_number);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_price_history_symbol ON stock_price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_price_history_timestamp ON stock_price_history(timestamp);

-- RLS (Row Level Security) policies
ALTER TABLE user_stock_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_price_history ENABLE ROW LEVEL SECURITY;

-- Policy for user_stock_profiles (users can only access their own data)
CREATE POLICY "Users can access their own stock profile" ON user_stock_profiles
    FOR ALL USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');

-- Policy for stock_alerts (users can only access their own alerts)
CREATE POLICY "Users can access their own alerts" ON stock_alerts
    FOR ALL USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');

-- Policy for stock_price_history (read-only for all authenticated users)
CREATE POLICY "Authenticated users can read stock price history" ON stock_price_history
    FOR SELECT USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_user_stock_profiles_updated_at 
    BEFORE UPDATE ON user_stock_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_alerts_updated_at 
    BEFORE UPDATE ON stock_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old stock price history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_stock_prices()
RETURNS void AS $$
BEGIN
    DELETE FROM stock_price_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old data (if pg_cron is available)
-- This would need to be set up separately in production
-- SELECT cron.schedule('cleanup-stock-prices', '0 2 * * *', 'SELECT cleanup_old_stock_prices();');

-- Insert some sample data for testing
INSERT INTO user_stock_profiles (phone_number, watched_stocks, risk_tolerance, preferred_sectors) 
VALUES 
    ('+1234567890', ARRAY['AAPL', 'TSLA', 'GOOGL'], 'moderate', ARRAY['Technology', 'Automotive']),
    ('+1987654321', ARRAY['MSFT', 'NVDA'], 'aggressive', ARRAY['Technology'])
ON CONFLICT (phone_number) DO NOTHING;

-- Insert some sample alerts
INSERT INTO stock_alerts (phone_number, symbol, alert_type, threshold, is_active) 
VALUES 
    ('+1234567890', 'AAPL', 'price_above', 150.00, true),
    ('+1234567890', 'TSLA', 'price_below', 200.00, true),
    ('+1987654321', 'MSFT', 'daily', NULL, true)
ON CONFLICT (phone_number, symbol, alert_type, threshold) DO NOTHING;

-- Grant necessary permissions (adjust based on your Supabase setup)
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON user_stock_profiles TO authenticated;
-- GRANT ALL ON stock_alerts TO authenticated;
-- GRANT SELECT ON stock_price_history TO authenticated;
