import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleMessage } from './handlers.js';
import { initializeWebhooks, sendAsCharacter } from './webhooks.js';
import { validateConfig } from './config.js';
// Global variable to track if a bot instance is already running
let isBotRunning = false;
// Initialize Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
// Event handler when the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    try {
        // Get webhook URLs
        const { webhookUrls } = validateConfig();
        // Initialize webhooks for each channel the bot has access to
        console.log('Starting webhook initialization...');
        for (const guild of client.guilds.cache.values()) {
            const channels = await guild.channels.fetch();
            for (const channel of channels.values()) {
                if (channel && channel.isTextBased()) {
                    try {
                        await initializeWebhooks(channel.id, webhookUrls);
                        console.log(`Webhooks initialized for channel: ${channel.id}`);
                        // Simple test message to verify webhook system
                        if (channel.id === process.env.DISCORD_CHANNEL_ID) {
                            console.log('Sending test message to verify webhook system...');
                            await sendAsCharacter(channel.id, 'donte', "Hey everyone! Just testing the webhook system.");
                            console.log('Test message sent successfully');
                        }
                    }
                    catch (error) {
                        console.error(`Failed to initialize webhooks for channel ${channel.id}:`, error);
                    }
                }
            }
        }
        console.log('All webhooks initialized successfully');
        console.log('Discord bot started successfully');
    }
    catch (error) {
        console.error('Error during bot initialization:', error);
    }
});
// Handle incoming messages
client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots to prevent loops
    if (message.author.bot)
        return;
    try {
        await handleMessage(message);
    }
    catch (error) {
        console.error('Error handling message:', error);
        try {
            await message.reply('Sorry, there was an error processing your message.');
        }
        catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
});
// Start the bot
export async function startBot() {
    console.log('Starting bot...');
    console.log('Instance ID:', process.env.BOT_INSTANCE_ID);
    console.log('Process ID:', process.pid);
    console.log('Environment:', process.env.NODE_ENV);
    // Check if another instance is already running
    if (isBotRunning) {
        console.error('Another bot instance is already running. Exiting...');
        process.exit(1);
    }
    isBotRunning = true;
    try {
        // Validate configuration and get token
        const { token } = validateConfig();
        // Log in to Discord
        await client.login(token);
    }
    catch (error) {
        console.error('Failed to start Discord bot:', error);
        isBotRunning = false;
        process.exit(1);
    }
}
// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    isBotRunning = false;
    client.destroy();
    process.exit(0);
});
// Export the client for use in other parts of the application
export { client };
