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

const CHARACTERS = ['DONTE', 'ALEX', 'ROHAN', 'VENUS', 'ELJAS', 'KAILEY'];
const CHANNEL_TYPES = ['GENERAL', 'THELOUNGE', 'PITCH', 'STAFFMEETINGS'];

export interface WebhookUrls {
  [channelType: string]: {
    [characterName: string]: string;
  };
}

export interface ChannelIds {
  [channelType: string]: string;
}

export interface ValidatedConfig {
  token: string;
  webhookUrls: WebhookUrls;
  channelIds: ChannelIds;
}

// Get webhook URLs for available characters
export function getWebhookUrls(): WebhookUrls {
  const webhookUrls: WebhookUrls = {};

  CHANNEL_TYPES.forEach(channelType => {
    const lowerChannelType = channelType.toLowerCase();
    webhookUrls[lowerChannelType] = {};
    CHARACTERS.forEach(character => {
      const lowerCharacter = character.toLowerCase();
      const envVarName = `${channelType}_${character}_WEBHOOK_URL`;
      const webhookUrl = process.env[envVarName];
      if (webhookUrl) {
        webhookUrls[lowerChannelType][lowerCharacter] = webhookUrl;
      }
    });
  });

  return webhookUrls;
}

// Environment variable validation
export function validateConfig(): ValidatedConfig {
  console.log('=== VALIDATING CONFIG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  const missingVars: string[] = [];

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    missingVars.push('DISCORD_BOT_TOKEN');
  }

  const channelIds: ChannelIds = {};
  CHANNEL_TYPES.forEach(channelType => {
    const envVarName = `${channelType}_CHANNEL_ID`;
    const channelId = process.env[envVarName];
    if (channelId) {
      channelIds[channelType.toLowerCase()] = channelId;
    } else {
      missingVars.push(envVarName);
    }
  });

  const webhookUrls = getWebhookUrls();

  CHANNEL_TYPES.forEach(channelType => {
    const lowerChannelType = channelType.toLowerCase();
    CHARACTERS.forEach(character => {
      const lowerCharacter = character.toLowerCase();
      const envVarName = `${channelType}_${character}_WEBHOOK_URL`;
      if (!webhookUrls[lowerChannelType]?.[lowerCharacter]) {
        missingVars.push(envVarName);
      }
    });
  });

  if (missingVars.length > 0) {
    const errorMessage = `Missing essential environment variables: ${missingVars.join(', ')}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log('✅ DISCORD_BOT_TOKEN found.');
  console.log('✅ Channel IDs found:');
  CHANNEL_TYPES.forEach(channelType => {
    const lowerChannelType = channelType.toLowerCase();
    if (channelIds[lowerChannelType]) {
      console.log(`  ${channelType}_CHANNEL_ID: ${channelIds[lowerChannelType]}`);
    }
  });

  console.log('✅ Webhook URLs found:');
  CHANNEL_TYPES.forEach(channelType => {
    const lowerChannelType = channelType.toLowerCase();
    const count = Object.keys(webhookUrls[lowerChannelType] || {}).length;
    console.log(`  ${channelType.toUpperCase()}: ${count} webhooks`);
    // Optional: Log if a specific webhook is missing, even if not throwing an error here
    // because missingVars check above should catch it.
    // CHARACTERS.forEach(character => {
    //     const lowerCharacter = character.toLowerCase();
    //     if (!webhookUrls[lowerChannelType]?.[lowerCharacter]) {
    //         console.warn(`  ⚠️ Missing webhook for ${character} in ${channelType}`);
    //     }
    // });
  });
  
  console.log('✅ Config validation successful');
  return { token: token!, webhookUrls, channelIds };
}