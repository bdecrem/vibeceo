#!/usr/bin/env node

/**
 * DEV REROUTE INTERACTIVE SHELL - ENHANCED
 *
 * This script creates an interactive shell where you can type WTAF commands.
 * It sends HTTP POST requests to localhost:3030 exactly like Twilio SMS webhooks.
 *
 * ENHANCEMENTS:
 * - Better response capture and display
 * - Hybrid mode: captures responses in terminal + shows SMS delivery info
 * - Timeout handling for slow responses
 * - Command history and logging
 * - Fallback to regular SMS endpoint if dev endpoint has issues
 *
 * Usage: npm run dev:reroute
 * Then type: wtaf create a hello world page
 *
 * The script will:
 * 1. Send HTTP POST to localhost:3030/dev/webhook (captures responses)
 * 2. Show all bot responses in terminal
 * 3. Also indicate what would be sent via SMS
 */

import { createInterface } from 'readline';
import { writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths relative to scripts/ folder
const SMS_BOT_ROOT = dirname(__dirname); // Go up one level from scripts/ to sms-bot/

// SMS bot configuration
const SMS_PORT = process.env.SMS_PORT || process.env.PORT || '3030';
const SMS_BOT_URL = `http://localhost:${SMS_PORT}`;
const DEV_WEBHOOK_ENDPOINT = '/dev/webhook'; // Captures responses
const SMS_WEBHOOK_ENDPOINT = '/sms/webhook'; // Regular SMS endpoint

// Configuration
let USE_HYBRID_MODE = false; // Set to true to also send to regular SMS endpoint
const RESPONSE_TIMEOUT = 15000; // 15 second timeout for responses

/**
 * Send HTTP POST request to SMS bot webhook endpoint
 */
async function sendSmsWebhook(message: string, fromNumber: string = '+16508989508'): Promise<boolean> {
    try {
        // Create Twilio-style webhook payload
        const payload = new URLSearchParams({
            'From': fromNumber,
            'To': '+19999999999', // Your bot's phone number
            'Body': message,
            'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
            'MessagingServiceSid': '',
            'NumMedia': '0',
            'SmsSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'SmsStatus': 'received',
            'SmsMessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'NumSegments': '1'
        });

        console.log(`📡 Sending to ${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}...`);
        console.log(`📱 From: ${fromNumber}`);
        console.log(`💬 Message: "${message}"`);
        console.log(`⏱️  Waiting for response (${RESPONSE_TIMEOUT/1000}s timeout)...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT);

        const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'fake-signature'
            },
            body: payload.toString(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log(`✅ Message sent successfully (${response.status})`);
            
            // Handle JSON response from dev webhook
            try {
                const responseData = await response.json() as any;
                
                if (responseData.success) {
                    const responses = responseData.responses || [];
                    if (responses.length > 0) {
                        console.log(`\n🤖 Bot Responses (${responses.length}):`);
                        console.log('═'.repeat(60));
                        responses.forEach((botResponse: string, index: number) => {
                            console.log(`${index + 1}. ${botResponse}`);
                            if (index < responses.length - 1) {
                                console.log('─'.repeat(40));
                            }
                        });
                        console.log('═'.repeat(60));
                        
                        // Show SMS delivery info
                        if (USE_HYBRID_MODE) {
                            console.log(`📱 These responses would also be sent to ${fromNumber} via SMS`);
                        } else {
                            console.log(`📱 In production, these would be sent to ${fromNumber} via SMS`);
                        }
                    } else {
                        console.log(`🤖 Bot processed message successfully but sent no responses`);
                        console.log(`ℹ️  This might be normal for some commands (like background processing)`);
                    }
                } else {
                    console.log(`⚠️  Processing error: ${responseData.error || 'Unknown error'}`);
                    const responses = responseData.responses || [];
                    if (responses.length > 0) {
                        console.log(`🤖 Partial responses received before error:`);
                        responses.forEach((botResponse: string, index: number) => {
                            console.log(`  ${index + 1}. ${botResponse}`);
                        });
                    }
                }
            } catch (parseError) {
                console.log(`⚠️  Could not parse JSON response, trying as text...`);
                const responseText = await response.text();
                if (responseText) {
                    console.log(`📤 Raw Response: ${responseText}`);
                }
            }
            
            // If hybrid mode is enabled, also send to regular SMS endpoint
            if (USE_HYBRID_MODE) {
                console.log(`\n📱 Hybrid mode: Also sending to SMS endpoint for real delivery...`);
                await sendToSmsEndpoint(message, fromNumber);
            }
            
            return true;
        } else {
            console.log(`❌ Failed to send message (${response.status})`);
            const errorText = await response.text();
            console.log(`💥 Error: ${errorText}`);
            
            // Don't automatically fallback - let user decide
            console.log(`❌ Dev webhook failed. Use 'hybrid' mode if you want to also send to SMS endpoint`);
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`⏰ Request timed out after ${RESPONSE_TIMEOUT/1000} seconds`);
            console.log(`ℹ️  The bot might still be processing your request`);
            console.log(`📱 Check your SMS for any responses that arrive later`);
        } else {
            console.log(`💥 Connection error: ${error instanceof Error ? error.message : String(error)}`);
            console.log(`❓ Is the SMS bot running on ${SMS_BOT_URL}?`);
        }
        return false;
    }
}

/**
 * Send to regular SMS endpoint (for hybrid mode or fallback)
 */
async function sendToSmsEndpoint(message: string, fromNumber: string): Promise<boolean> {
    try {
        const payload = new URLSearchParams({
            'From': fromNumber,
            'To': '+19999999999',
            'Body': message,
            'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
            'MessagingServiceSid': '',
            'NumMedia': '0',
            'SmsSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'SmsStatus': 'received',
            'SmsMessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
            'NumSegments': '1'
        });

        const response = await fetch(`${SMS_BOT_URL}${SMS_WEBHOOK_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'fake-signature'
            },
            body: payload.toString()
        });

        if (response.ok) {
            console.log(`✅ Message sent to SMS endpoint - responses will arrive via SMS`);
            return true;
        } else {
            console.log(`❌ SMS endpoint also failed (${response.status})`);
            return false;
        }
    } catch (error) {
        console.log(`💥 SMS endpoint error: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Save command history
 */
async function saveToHistory(command: string, success: boolean): Promise<void> {
    const historyFile = join(SMS_BOT_ROOT, "dev-reroute-history.txt");
    const timestamp = new Date().toISOString();
    const status = success ? "SENT" : "FAILED";
    const mode = USE_HYBRID_MODE ? "HYBRID" : "DEV";
    const historyLine = `[${timestamp}] ${status} (${mode}): "${command}"\n`;

    try {
        if (existsSync(historyFile)) {
            await appendFile(historyFile, historyLine);
        } else {
            await writeFile(
                historyFile,
                `DEV REROUTE Command History\n===========================\n\n${historyLine}`
            );
        }
    } catch (error) {
        console.error(`Error saving to history: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Test connection to SMS bot
 */
async function testConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${SMS_BOT_URL}/health`, { 
            method: 'GET'
            // timeout: 5000 // Note: timeout not supported in node-fetch
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Process a user command
 */
async function processCommand(input: string): Promise<void> {
    const command = input.trim();
    
    if (!command) {
        return;
    }

    // Handle special commands
    if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
        console.log('👋 Goodbye!');
        process.exit(0);
    }

    if (command.toLowerCase() === 'help') {
        showHelp();
        return;
    }

    if (command.toLowerCase() === 'status') {
        console.log('🔍 Checking SMS bot connection...');
        const isConnected = await testConnection();
        if (isConnected) {
            console.log(`✅ SMS bot is running on ${SMS_BOT_URL}`);
        } else {
            console.log(`❌ Cannot connect to SMS bot on ${SMS_BOT_URL}`);
            console.log('💡 Make sure to start the SMS bot first: npm run start');
        }
        return;
    }

    if (command.toLowerCase() === 'hybrid') {
        USE_HYBRID_MODE = !USE_HYBRID_MODE;
        console.log(`🔄 Hybrid mode ${USE_HYBRID_MODE ? 'ENABLED' : 'DISABLED'}`);
        if (USE_HYBRID_MODE) {
            console.log('📱 Commands will be sent to dev endpoint AND SMS endpoint');
            console.log('📱 You\'ll see responses in terminal AND receive SMS messages');
        } else {
            console.log('📱 Commands will only be sent to dev endpoint');
            console.log('📱 You\'ll only see responses in terminal');
        }
        return;
    }

    if (command.toLowerCase() === 'history') {
        const historyFile = join(SMS_BOT_ROOT, "dev-reroute-history.txt");
        try {
            if (existsSync(historyFile)) {
                const history = await import('fs').then(fs => fs.readFileSync(historyFile, 'utf8'));
                console.log('\n📜 Command History:');
                console.log(history);
            } else {
                console.log('📜 No command history found');
            }
        } catch (error) {
            console.log('❌ Error reading history file');
        }
        return;
    }

    // Send the command as SMS
    console.log(''); // Add some spacing
    const success = await sendSmsWebhook(command);
    await saveToHistory(command, success);
    
    if (success) {
        console.log('✅ Command processed successfully!');
    } else {
        console.log('❌ Command failed to process');
    }
    console.log(''); // Add some spacing before next prompt
}

/**
 * Show help information
 */
function showHelp(): void {
    console.log(`
📚 DEV REROUTE HELP
==================

WTAF Commands:
  wtaf create a hello world page     - Send WTAF request
  wtaf -alex- build a contact form   - Send with coach injection
  wtaf make a tetris game            - Send game request
  commands                           - Show available bot commands
  help                              - Show bot help
  
Script Commands:
  help                              - Show this help
  status                            - Check SMS bot connection
  hybrid                            - Toggle hybrid mode (dev + SMS)
  history                           - Show command history
  exit / quit                       - Exit the shell

Current Mode: ${USE_HYBRID_MODE ? 'HYBRID (dev + SMS)' : 'DEV ONLY'}
${USE_HYBRID_MODE ? '📱 Responses shown in terminal AND sent to SMS' : '📱 Responses only shown in terminal'}

Tips:
  • Make sure SMS bot is running: npm run start
  • Dev endpoint: ${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}
  • SMS endpoint: ${SMS_BOT_URL}${SMS_WEBHOOK_ENDPOINT}
  • History saved to dev-reroute-history.txt
  • Just type naturally like you would text the bot!

Troubleshooting:
  • If responses are missing, try "hybrid" mode
  • If timeout occurs, the bot may still be processing
  • Check SMS for delayed responses
  • Use "status" to verify bot connection
`);
}

/**
 * Start the interactive shell
 */
async function startInteractiveShell(): Promise<void> {
    console.log("=" + "=".repeat(79));
    console.log("🔄 DEV REROUTE INTERACTIVE SHELL - ENHANCED");
    console.log(`📡 Sends HTTP requests to SMS bot on port ${SMS_PORT}`);
    console.log("🎯 Captures responses in terminal + optional SMS delivery");
    console.log("=" + "=".repeat(79));

    // Test initial connection
    console.log('🔍 Testing connection to SMS bot...');
    const isConnected = await testConnection();
    if (isConnected) {
        console.log(`✅ SMS bot is running on ${SMS_BOT_URL}`);
    } else {
        console.log(`⚠️  Cannot connect to SMS bot on ${SMS_BOT_URL}`);
        console.log('💡 Make sure to start the SMS bot first: npm run start');
        console.log('🔄 You can still try sending commands - the bot might start up.');
    }

    console.log(`
🎯 Ready! Type your WTAF commands and press Enter.
💡 Type 'help' for commands, 'hybrid' for dual mode, 'exit' to quit.
📁 History saved to dev-reroute-history.txt

Mode: ${USE_HYBRID_MODE ? 'HYBRID (dev + SMS)' : 'DEV ONLY'}
${USE_HYBRID_MODE ? '📱 You\'ll see responses here AND receive SMS' : '📱 You\'ll only see responses here'}

Try these commands:
  wtaf create a hello world page
  commands
  help
  hybrid
`);

    // Create readline interface
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `🤖 ${USE_HYBRID_MODE ? 'hybrid' : 'dev'}> `
    });

    // Handle user input
    rl.on('line', async (input) => {
        await processCommand(input);
        rl.setPrompt(`🤖 ${USE_HYBRID_MODE ? 'hybrid' : 'dev'}> `);
        rl.prompt(); // Show prompt again
    });

    // Handle Ctrl+C
    rl.on('SIGINT', () => {
        console.log('\n👋 Goodbye!');
        process.exit(0);
    });

    // Start the prompt
    rl.prompt();
}

// Check if script was called with arguments (old behavior)
const args = process.argv.slice(2);
if (args.length > 0) {
    console.log("🔄 Single command mode");
    const command = args.join(" ");
    processCommand(command).then(() => {
        console.log("✅ Command sent!");
        process.exit(0);
    }).catch((error) => {
        console.error("💥 Error:", error);
        process.exit(1);
    });
} else {
    // Start interactive mode
    startInteractiveShell().catch((error) => {
        console.error("💥 Fatal error:", error);
        process.exit(1);
    });
}
