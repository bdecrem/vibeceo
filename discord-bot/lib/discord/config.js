"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCORD_CONFIG = void 0;
exports.getWebhookUrls = getWebhookUrls;
exports.validateConfig = validateConfig;
// Discord bot configuration
exports.DISCORD_CONFIG = {
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
function getWebhookUrls() {
    var webhookUrls = {};
    // Load webhook URLs from environment variables
    // General channel webhooks
    if (process.env.GENERAL_WEBHOOK_URL_DONTE) {
        webhookUrls['general_donte'] = process.env.GENERAL_WEBHOOK_URL_DONTE;
    }
    if (process.env.GENERAL_WEBHOOK_URL_ALEX) {
        webhookUrls['general_alex'] = process.env.GENERAL_WEBHOOK_URL_ALEX;
    }
    if (process.env.GENERAL_WEBHOOK_URL_ROHAN) {
        webhookUrls['general_rohan'] = process.env.GENERAL_WEBHOOK_URL_ROHAN;
    }
    if (process.env.GENERAL_WEBHOOK_URL_VENUS) {
        webhookUrls['general_venus'] = process.env.GENERAL_WEBHOOK_URL_VENUS;
    }
    if (process.env.GENERAL_WEBHOOK_URL_ELJAS) {
        webhookUrls['general_eljas'] = process.env.GENERAL_WEBHOOK_URL_ELJAS;
    }
    if (process.env.GENERAL_WEBHOOK_URL_KAILEY) {
        webhookUrls['general_kailey'] = process.env.GENERAL_WEBHOOK_URL_KAILEY;
    }
    // Staff meetings channel webhooks
    if (process.env.STAFF_WEBHOOK_URL_DONTE) {
        webhookUrls['staff_donte'] = process.env.STAFF_WEBHOOK_URL_DONTE;
    }
    if (process.env.STAFF_WEBHOOK_URL_ALEX) {
        webhookUrls['staff_alex'] = process.env.STAFF_WEBHOOK_URL_ALEX;
    }
    if (process.env.STAFF_WEBHOOK_URL_ROHAN) {
        webhookUrls['staff_rohan'] = process.env.STAFF_WEBHOOK_URL_ROHAN;
    }
    if (process.env.STAFF_WEBHOOK_URL_VENUS) {
        webhookUrls['staff_venus'] = process.env.STAFF_WEBHOOK_URL_VENUS;
    }
    if (process.env.STAFF_WEBHOOK_URL_ELJAS) {
        webhookUrls['staff_eljas'] = process.env.STAFF_WEBHOOK_URL_ELJAS;
    }
    if (process.env.STAFF_WEBHOOK_URL_KAILEY) {
        webhookUrls['staff_kailey'] = process.env.STAFF_WEBHOOK_URL_KAILEY;
    }
    return webhookUrls;
}
// Environment variable validation
function validateConfig() {
    var token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
    }
    var webhookUrls = getWebhookUrls();
    if (Object.keys(webhookUrls).length === 0) {
        throw new Error('No webhook URLs configured in environment variables');
    }
    return { token: token, webhookUrls: webhookUrls };
}
