#!/usr/bin/env node

/**
 * DEV REROUTE INTERACTIVE SHELL
 *
 * This script creates an interactive shell where you can type WTAF commands.
 * It sends HTTP POST requests to localhost:3030 exactly like Twilio SMS webhooks.
 *
 * Usage: npm run dev:reroute
 * Then type: wtaf create a hello world page
 *
 * The script will:
 * 1. Send HTTP POST to localhost:3030/webhook (SMS endpoint)
 * 2. Let the SMS bot system process it normally
 * 3. Wait for your next command
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
const SMS_BOT_URL = 'http://localhost:3030';
const DEV_WEBHOOK_ENDPOINT = '/dev/webhook'; // Dev webhook endpoint that captures responses

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

		const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-Twilio-Signature': 'fake-signature' // SMS bot might validate this
			},
			body: payload.toString()
		});

		if (response.ok) {
			console.log(`✅ Message sent successfully (${response.status})`);
			
			// Handle JSON response from dev webhook
			try {
				const responseData = await response.json() as any;
				
				if (responseData.success) {
					const responses = responseData.responses || [];
					if (responses.length > 0) {
						console.log(`🤖 Bot responses (${responses.length}):`);
						responses.forEach((botResponse: string, index: number) => {
							console.log(`  ${index + 1}. ${botResponse}`);
						});
					} else {
						console.log(`🤖 Bot processed message but sent no responses`);
					}
				} else {
					console.log(`⚠️  Processing error: ${responseData.error || 'Unknown error'}`);
					const responses = responseData.responses || [];
					if (responses.length > 0) {
						console.log(`🤖 Partial responses received:`);
						responses.forEach((botResponse: string, index: number) => {
							console.log(`  ${index + 1}. ${botResponse}`);
						});
					}
				}
			} catch (parseError) {
				// Fallback to text response if JSON parsing fails
				const responseText = await response.text();
				if (responseText) {
					console.log(`📤 Response: ${responseText}`);
				}
			}
			
			return true;
		} else {
			console.log(`❌ Failed to send message (${response.status})`);
			const errorText = await response.text();
			console.log(`💥 Error: ${errorText}`);
			return false;
		}
	} catch (error) {
		console.log(`💥 Connection error: ${error instanceof Error ? error.message : String(error)}`);
		console.log(`❓ Is the SMS bot running on ${SMS_BOT_URL}?`);
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
	const historyLine = `[${timestamp}] ${status}: "${command}"\n`;

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

	// Send the command as SMS
	console.log(''); // Add some spacing
	const success = await sendSmsWebhook(command);
	await saveToHistory(command, success);
	
	if (success) {
		console.log('🎯 Command sent! Check your SMS bot logs for processing.');
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

Commands you can type:
  wtaf create a hello world page     - Send WTAF request
  wtaf -alex- build a contact form   - Send with coach injection
  wtaf make a tetris game            - Send game request
  
Special commands:
  help                               - Show this help
  status                             - Check SMS bot connection  
  exit / quit                        - Exit the shell

Tips:
  • Make sure SMS bot is running: npm run start
  • Commands are sent to ${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}
  • History saved to dev-reroute-history.txt
  • Just type naturally like you would text the bot!
`);
}

/**
 * Start the interactive shell
 */
async function startInteractiveShell(): Promise<void> {
	console.log("=" + "=".repeat(79));
	console.log("🔄 DEV REROUTE INTERACTIVE SHELL");
	console.log("📡 Sends HTTP requests to SMS bot on port 3030");
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
💡 Type 'help' for examples, 'status' to check connection, 'exit' to quit.
📁 Command history will be saved to dev-reroute-history.txt

Examples:
  wtaf create a hello world page
  wtaf -alex- build a contact form
  wtaf make a tetris game
`);

	// Create readline interface
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '🤖 wtaf> '
	});

	// Handle user input
	rl.on('line', async (input) => {
		await processCommand(input);
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
