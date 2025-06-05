// Discord bot configuration
export const DISCORD_CONFIG = {
  // Command prefix for bot commands
  prefix: '!',
  
  // Channels where the bot is allowed to respond
  // Empty array means all channels
  allowedChannels: [] as string[],
  
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
  const webhookUrls: Record<string, string> = {};
  
  // Debug: Log all environment variable names in production
  if (process.env.NODE_ENV === 'production') {
    console.log('=== DEBUG: AVAILABLE ENVIRONMENT VARIABLES ===');
    const envVars = Object.keys(process.env).sort();
    console.log('Total env vars:', envVars.length);
    console.log('Environment variable names:', envVars.join(', '));
    
    // Look for webhook-related variables
    const webhookVars = envVars.filter(key => key.includes('WEBHOOK'));
    console.log('=== DEBUG: WEBHOOK-RELATED VARIABLES ===');
    console.log('Webhook variables:', webhookVars.join(', '));
  }
  
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
  
  // The Lounge channel webhooks
  if (process.env.LOUNGE_WEBHOOK_URL_DONTE) {
    webhookUrls['lounge_donte'] = process.env.LOUNGE_WEBHOOK_URL_DONTE;
  }
  if (process.env.LOUNGE_WEBHOOK_URL_ALEX) {
    webhookUrls['lounge_alex'] = process.env.LOUNGE_WEBHOOK_URL_ALEX;
  }
  if (process.env.LOUNGE_WEBHOOK_URL_ROHAN) {
    webhookUrls['lounge_rohan'] = process.env.LOUNGE_WEBHOOK_URL_ROHAN;
  }
  if (process.env.LOUNGE_WEBHOOK_URL_VENUS) {
    webhookUrls['lounge_venus'] = process.env.LOUNGE_WEBHOOK_URL_VENUS;
  }
  if (process.env.LOUNGE_WEBHOOK_URL_ELJAS) {
    webhookUrls['lounge_eljas'] = process.env.LOUNGE_WEBHOOK_URL_ELJAS;
  }
  if (process.env.LOUNGE_WEBHOOK_URL_KAILEY) {
    webhookUrls['lounge_kailey'] = process.env.LOUNGE_WEBHOOK_URL_KAILEY;
  }
  
  // Pitch channel webhooks
  if (process.env.PITCH_WEBHOOK_URL_DONTE) {
    webhookUrls['pitch_donte'] = process.env.PITCH_WEBHOOK_URL_DONTE;
  }
  if (process.env.PITCH_WEBHOOK_URL_ALEX) {
    webhookUrls['pitch_alex'] = process.env.PITCH_WEBHOOK_URL_ALEX;
  }
  if (process.env.PITCH_WEBHOOK_URL_ROHAN) {
    webhookUrls['pitch_rohan'] = process.env.PITCH_WEBHOOK_URL_ROHAN;
  }
  if (process.env.PITCH_WEBHOOK_URL_VENUS) {
    webhookUrls['pitch_venus'] = process.env.PITCH_WEBHOOK_URL_VENUS;
  }
  if (process.env.PITCH_WEBHOOK_URL_ELJAS) {
    webhookUrls['pitch_eljas'] = process.env.PITCH_WEBHOOK_URL_ELJAS;
  }
  if (process.env.PITCH_WEBHOOK_URL_KAILEY) {
    webhookUrls['pitch_kailey'] = process.env.PITCH_WEBHOOK_URL_KAILEY;
  }
  
  // Alexir VIP webhook for cross-posting
  if (process.env.ALEXIR_VIP_WEBHOOK_URL) {
    webhookUrls['alexir_vip'] = process.env.ALEXIR_VIP_WEBHOOK_URL;
    console.log('[Config] Found Alexir VIP webhook URL for cross-posting');
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[Config] ALEXIR_VIP_WEBHOOK_URL not found in production environment');
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
  console.log('=== DEBUG: WEBHOOK URLS FOUND ===');
  console.log('Found webhook URLs:', Object.keys(webhookUrls));
  
  if (Object.keys(webhookUrls).length === 0) {
    console.log('=== ERROR: NO WEBHOOK URLS FOUND ===');
    console.log('This could indicate environment variables are not being correctly loaded or named');
    throw new Error('No webhook URLs configured in environment variables');
  }
  
  return { token, webhookUrls };
} 