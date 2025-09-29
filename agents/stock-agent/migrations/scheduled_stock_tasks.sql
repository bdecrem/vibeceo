-- Scheduled Stock Tasks Schema
-- Creates tables for scheduled stock updates and alerts

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_stock_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('daily_update', 'portfolio_summary', 'stock_price', 'market_analysis')),
    schedule_time TIME NOT NULL, -- Time of day to execute (e.g., '07:00:00')
    timezone TEXT DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT true,
    task_config JSONB DEFAULT '{}', -- Stores task-specific configuration
    last_executed TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations per user
    UNIQUE(phone_number, task_type, schedule_time)
);

-- Task execution history table
CREATE TABLE IF NOT EXISTS scheduled_task_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES scheduled_stock_tasks(id) ON DELETE CASCADE,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    message_sent BOOLEAN DEFAULT false,
    error_message TEXT,
    response_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_stock_tasks_phone ON scheduled_stock_tasks(phone_number);
CREATE INDEX IF NOT EXISTS idx_scheduled_stock_tasks_active ON scheduled_stock_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_stock_tasks_next_execution ON scheduled_stock_tasks(next_execution);
CREATE INDEX IF NOT EXISTS idx_scheduled_task_executions_task ON scheduled_task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_task_executions_time ON scheduled_task_executions(execution_time);

-- RLS (Row Level Security) policies
ALTER TABLE scheduled_stock_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_task_executions ENABLE ROW LEVEL SECURITY;

-- Policy for scheduled_stock_tasks (users can only access their own tasks)
CREATE POLICY "Users can access their own scheduled tasks" ON scheduled_stock_tasks
    FOR ALL USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');

-- Policy for scheduled_task_executions (users can only access their own executions)
CREATE POLICY "Users can access their own task executions" ON scheduled_task_executions
    FOR ALL USING (task_id IN (
        SELECT id FROM scheduled_stock_tasks 
        WHERE phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number'
    ));

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_stock_tasks_updated_at 
    BEFORE UPDATE ON scheduled_stock_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_scheduled_tasks_updated_at();

-- Function to calculate next execution time
CREATE OR REPLACE FUNCTION calculate_next_execution(
    schedule_time TIME,
    timezone_name TEXT DEFAULT 'America/New_York'
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_execution TIMESTAMP WITH TIME ZONE;
    current_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    current_timestamp = NOW() AT TIME ZONE timezone_name;
    next_execution = (CURRENT_DATE + schedule_time) AT TIME ZONE timezone_name;
    
    -- If the scheduled time has already passed today, schedule for tomorrow
    IF next_execution <= current_timestamp THEN
        next_execution = (CURRENT_DATE + INTERVAL '1 day' + schedule_time) AT TIME ZONE timezone_name;
    END IF;
    
    RETURN next_execution;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old execution history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_task_executions()
RETURNS void AS $$
BEGIN
    DELETE FROM scheduled_task_executions 
    WHERE execution_time < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
