// Discord bot configuration
export const DISCORD_CONFIG = {
    // Command prefix for bot commands
    prefix: '!',
    // Channels where the bot is allowed to respond
    // Empty array means all channels
    allowedChannels: [],
    // Default responses
    responses: {
        error: 'Sorry, I encountered an error processing your message.',
        unknownCommand: 'Unknown command. Type !help for available commands.',
        noCharacterSelected: 'No character is currently selected. Use !character select [name] to choose a character.',
    },
    // Command cooldowns in milliseconds
    cooldowns: {
        default: 1000, // 1 second
        characterSelect: 5000, // 5 seconds
    },
};
// Get webhook URLs for available characters
export function getWebhookUrls() {
    const webhookUrls = {};
    // Load webhook URLs from environment variables
    if (process.env.WEBHOOK_URL_DONTE) {
        webhookUrls['donte'] = process.env.WEBHOOK_URL_DONTE;
    }
    if (process.env.WEBHOOK_URL_ALEX) {
        webhookUrls['alex'] = process.env.WEBHOOK_URL_ALEX;
    }
    if (process.env.WEBHOOK_URL_ROHAN) {
        webhookUrls['rohan'] = process.env.WEBHOOK_URL_ROHAN;
    }
    if (process.env.WEBHOOK_URL_VENUS) {
        webhookUrls['venus'] = process.env.WEBHOOK_URL_VENUS;
    }
    if (process.env.WEBHOOK_URL_ELJAS) {
        webhookUrls['eljas'] = process.env.WEBHOOK_URL_ELJAS;
    }
    if (process.env.WEBHOOK_URL_KAILEY) {
        webhookUrls['kailey'] = process.env.WEBHOOK_URL_KAILEY;
    }
    return webhookUrls;
}
// Environment variable validation
export function validateConfig() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
    }
    const webhookUrls = getWebhookUrls();
    if (Object.keys(webhookUrls).length === 0) {
        throw new Error('No webhook URLs configured in environment variables');
    }
    return { token, webhookUrls };
}
