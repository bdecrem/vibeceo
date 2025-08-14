#!/usr/bin/env node

/**
 * Claude Code Token Usage Tracker
 * 
 * This script tracks token usage for Claude Code and Anthropic API calls
 * Run this in the background or as a cron job to monitor usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_FILE = path.join(__dirname, '../data/claude-usage-tracking.json');
const LOG_FILE = path.join(__dirname, '../../sms-bot/engine.log');

// Ensure data directory exists
const dataDir = path.dirname(USAGE_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing usage data or create new
function loadUsageData() {
    if (fs.existsSync(USAGE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
        } catch (error) {
            console.error('Error loading usage data:', error);
            return createEmptyUsageData();
        }
    }
    return createEmptyUsageData();
}

function createEmptyUsageData() {
    return {
        daily: {},
        cumulative: {
            totalTokens: 0,
            totalRequests: 0,
            totalCost: 0
        },
        sessions: [],
        lastUpdated: new Date().toISOString()
    };
}

// Save usage data
function saveUsageData(data) {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

// Parse log file for Claude API usage
async function parseLogFile() {
    if (!fs.existsSync(LOG_FILE)) {
        console.log('Log file not found:', LOG_FILE);
        return [];
    }

    const fileStream = fs.createReadStream(LOG_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const usage = [];
    const today = new Date().toISOString().split('T')[0];

    for await (const line of rl) {
        // Look for Claude API calls and token mentions
        if (line.includes('claude') && line.includes('token')) {
            const timestamp = extractTimestamp(line);
            const date = timestamp ? timestamp.split('T')[0] : today;
            
            // Extract token limits (actual usage would need API response parsing)
            const tokenMatch = line.match(/(\d+)\s*tokens?/i);
            const modelMatch = line.match(/claude-[\w-]+/i);
            
            if (tokenMatch) {
                usage.push({
                    date,
                    timestamp: timestamp || new Date().toISOString(),
                    model: modelMatch ? modelMatch[0] : 'claude-unknown',
                    tokens: parseInt(tokenMatch[1]),
                    source: 'log',
                    line: line.substring(0, 200) // Store first 200 chars for context
                });
            }
        }
    }

    return usage;
}

// Extract timestamp from log line
function extractTimestamp(line) {
    // Try common timestamp formats
    const patterns = [
        /\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*Z?)\]/,
        /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*Z?)/,
        /\[([^\]]+)\]/ // Generic bracket format
    ];
    
    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            try {
                const date = new Date(match[1]);
                if (!isNaN(date.getTime())) {
                    return date.toISOString();
                }
            } catch {}
        }
    }
    return null;
}

// Calculate daily statistics
function calculateDailyStats(usageData) {
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = usageData.daily[today] || {
        requests: 0,
        estimatedTokens: 0,
        models: {}
    };

    return {
        date: today,
        requests: todayUsage.requests,
        estimatedTokens: todayUsage.estimatedTokens,
        averageTokensPerRequest: todayUsage.requests > 0 
            ? Math.round(todayUsage.estimatedTokens / todayUsage.requests)
            : 0,
        modelsUsed: Object.keys(todayUsage.models || {})
    };
}

// Estimate costs (using Anthropic pricing as of 2025)
function estimateCost(tokens, model) {
    // Rough estimates - update with actual pricing
    const pricing = {
        'claude-3-5-sonnet': { input: 0.003, output: 0.015 }, // per 1K tokens
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
        'default': { input: 0.003, output: 0.015 }
    };

    const modelPricing = Object.keys(pricing).find(key => model.includes(key)) 
        ? pricing[Object.keys(pricing).find(key => model.includes(key))]
        : pricing.default;

    // Assume 70% input, 30% output for estimation
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens * modelPricing.input / 1000) + 
           (outputTokens * modelPricing.output / 1000);
}

// Main tracking function
async function trackUsage() {
    console.log('Claude Code Token Usage Tracker');
    console.log('================================\n');

    const usageData = loadUsageData();
    const logUsage = await parseLogFile();
    
    // Update usage data with log findings
    const today = new Date().toISOString().split('T')[0];
    if (!usageData.daily[today]) {
        usageData.daily[today] = {
            requests: 0,
            estimatedTokens: 0,
            estimatedCost: 0,
            models: {}
        };
    }

    // Process log entries for today
    const todayEntries = logUsage.filter(entry => entry.date === today);
    
    todayEntries.forEach(entry => {
        usageData.daily[today].requests++;
        usageData.daily[today].estimatedTokens += entry.tokens;
        usageData.daily[today].models[entry.model] = 
            (usageData.daily[today].models[entry.model] || 0) + 1;
    });

    // Calculate estimated cost
    let totalCost = 0;
    Object.entries(usageData.daily[today].models).forEach(([model, count]) => {
        const avgTokens = usageData.daily[today].estimatedTokens / 
                         usageData.daily[today].requests;
        totalCost += estimateCost(avgTokens * count, model);
    });
    usageData.daily[today].estimatedCost = totalCost;

    // Update cumulative stats
    usageData.cumulative.totalRequests = Object.values(usageData.daily)
        .reduce((sum, day) => sum + day.requests, 0);
    usageData.cumulative.totalTokens = Object.values(usageData.daily)
        .reduce((sum, day) => sum + day.estimatedTokens, 0);
    usageData.cumulative.totalCost = Object.values(usageData.daily)
        .reduce((sum, day) => sum + (day.estimatedCost || 0), 0);

    // Save updated data
    saveUsageData(usageData);

    // Display today's statistics
    const stats = calculateDailyStats(usageData);
    
    console.log(`📊 Today's Usage (${stats.date}):`);
    console.log(`   Requests: ${stats.requests}`);
    console.log(`   Estimated Tokens: ${stats.estimatedTokens.toLocaleString()}`);
    console.log(`   Avg Tokens/Request: ${stats.averageTokensPerRequest.toLocaleString()}`);
    console.log(`   Models Used: ${stats.modelsUsed.join(', ') || 'None'}`);
    console.log(`   Estimated Cost: $${usageData.daily[today].estimatedCost.toFixed(4)}`);
    
    console.log('\n📈 Cumulative Statistics:');
    console.log(`   Total Requests: ${usageData.cumulative.totalRequests.toLocaleString()}`);
    console.log(`   Total Tokens: ${usageData.cumulative.totalTokens.toLocaleString()}`);
    console.log(`   Total Estimated Cost: $${usageData.cumulative.totalCost.toFixed(2)}`);
    
    // Show last 7 days trend
    console.log('\n📅 Last 7 Days:');
    const last7Days = Object.keys(usageData.daily)
        .sort()
        .slice(-7)
        .map(date => ({
            date,
            requests: usageData.daily[date].requests,
            tokens: usageData.daily[date].estimatedTokens,
            cost: usageData.daily[date].estimatedCost || 0
        }));
    
    last7Days.forEach(day => {
        const bar = '█'.repeat(Math.min(50, Math.round(day.tokens / 1000)));
        console.log(`   ${day.date}: ${bar} ${day.tokens.toLocaleString()} tokens ($${day.cost.toFixed(4)})`);
    });

    console.log('\n💡 Note: These are estimates based on log parsing.');
    console.log('   For accurate usage, we need to capture actual API responses.');
    console.log('\n📁 Data saved to:', USAGE_FILE);

    return usageData;
}

// Monitor mode - continuously watch for new usage
async function monitorMode() {
    console.log('Starting continuous monitoring mode...');
    console.log('Press Ctrl+C to stop\n');

    // Initial scan
    await trackUsage();

    // Watch for changes every 5 minutes
    setInterval(async () => {
        console.log('\n' + '='.repeat(50));
        console.log('Updating usage statistics...');
        await trackUsage();
    }, 5 * 60 * 1000); // 5 minutes
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

if (command === 'monitor') {
    monitorMode();
} else if (command === 'reset') {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(createEmptyUsageData(), null, 2));
    console.log('Usage data reset successfully');
} else if (command === 'export') {
    const data = loadUsageData();
    const exportFile = args[1] || `claude-usage-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(data, null, 2));
    console.log(`Usage data exported to: ${exportFile}`);
} else {
    // Default: show current usage
    trackUsage().catch(error => {
        console.error('Error tracking usage:', error);
        process.exit(1);
    });
}

// Instructions for better tracking
if (!command || command === 'help') {
    console.log('\n📚 Usage Instructions:');
    console.log('   node track-claude-usage.js          # Show current usage');
    console.log('   node track-claude-usage.js monitor  # Continuous monitoring');
    console.log('   node track-claude-usage.js reset    # Reset usage data');
    console.log('   node track-claude-usage.js export   # Export data to JSON');
    console.log('\n🔧 For accurate token tracking, consider:');
    console.log('   1. Enabling Claude Code verbose logging');
    console.log('   2. Intercepting API responses to capture actual usage');
    console.log('   3. Setting up a proper monitoring solution');
}