import { Client, GatewayIntentBits } from 'discord.js';
import { handleCommand } from './commands/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name and load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

console.log('Starting Discord bot...');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Handle graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('Received shutdown signal. Starting graceful shutdown...');
    
    try {
        // Cleanup any active discussions
        // TODO: Add cleanup code here
        
        // Destroy the client connection
        await client.destroy();
        console.log('Successfully closed Discord connection');
        
        // Exit process
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle various shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon restart

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on('messageCreate', async message => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    try {
        // Handle commands
        if (message.content.startsWith('!')) {
            await handleCommand(message);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await message.reply('Sorry, there was an error processing your request.');
    }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN); 