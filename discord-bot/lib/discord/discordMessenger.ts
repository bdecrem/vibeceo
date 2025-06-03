import { WebhookClient, Client } from 'discord.js';

// Configuration types
interface CoachIdentity {
  name: string;        // Full display name (e.g. "Donte Disrupt")
  username: string;    // Username for webhook (e.g. "DonteDisrupt")
  avatarUrl: string;   // URL to avatar image
  webhookEnvVar: string; // Environment variable name for this coach's webhook
}

// Discord Messenger class to handle all Discord communications
export class DiscordMessenger {
  private static instance: DiscordMessenger;
  private coachWebhooks: Map<string, WebhookClient> = new Map();
  private discordClient: Client | null = null;
  private isProduction: boolean;
  private envSource: string;
  
  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.envSource = this.isProduction ? 'Railway environment' : '.env.local file';
  }
  
  // Singleton pattern to ensure only one instance exists
  static getInstance(): DiscordMessenger {
    if (!DiscordMessenger.instance) {
      DiscordMessenger.instance = new DiscordMessenger();
    }
    return DiscordMessenger.instance;
  }

  // Get webhook for a specific coach
  async getCoachWebhook(coachId: string): Promise<WebhookClient> {
    try {
      // Return cached webhook if it exists
      if (this.coachWebhooks.has(coachId)) {
        return this.coachWebhooks.get(coachId)!;
      }
      
      // Get coach configuration
      const coach = this.getCoachConfig(coachId);
      if (!coach) {
        console.error(`[DiscordMessenger] Unknown coach: ${coachId}`);
        throw new Error(`Unknown coach: ${coachId}. Check if this coach ID is valid.`);
      }
      
      // Get webhook URL from environment
      const webhookUrl = process.env[coach.webhookEnvVar];
      if (!webhookUrl) {
        console.error(`[DiscordMessenger] Missing ${coach.webhookEnvVar} in ${this.envSource}`);
        throw new Error(`Missing ${coach.webhookEnvVar} webhook URL in ${this.envSource}. Make sure all webhook URLs are set up.`);
      }
      
      // Create webhook client
      try {
        const webhook = new WebhookClient({ url: webhookUrl });
        this.coachWebhooks.set(coachId, webhook);
        console.log(`[DiscordMessenger] Created webhook for ${coach.name} (${coachId})`);
        return webhook;
      } catch (error) {
        console.error(`[DiscordMessenger] Error creating webhook for ${coachId}:`, error);
        throw new Error(`Failed to create webhook for ${coachId}. Check if the webhook URL is valid.`);
      }
    } catch (error) {
      console.error(`[DiscordMessenger] Error in getCoachWebhook for ${coachId}:`, error);
      throw error;
    }
  }
  
  // Set Discord client for system messages
  setDiscordClient(client: Client): void {
    this.discordClient = client;
  }
  
  // Send message as a coach
  async sendAsCoach(
    channelId: string, 
    coachId: string, 
    message: string
  ): Promise<boolean> {
    try {
      // Get coach webhook
      const webhook = await this.getCoachWebhook(coachId);
      const coach = this.getCoachConfig(coachId);
      
      if (!coach) {
        console.error(`[DiscordMessenger] Unknown coach: ${coachId}`);
        return false;
      }
      
      // Send message - don't override webhook username/avatar
      await webhook.send({
        content: message
      });
      
      console.log(`[DiscordMessenger] Sent message as ${coach.name} to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Error sending message as coach ${coachId}:`, error);
      return false;
    }
  }
  
  // Send intro message from TheAF
  async sendIntro(
    channelId: string,
    conversationType: string,
    introText?: string
  ): Promise<boolean> {
    try {
      if (!this.discordClient) {
        console.error('[DiscordMessenger] Discord client not set');
        return false;
      }
      
      const channel = await this.discordClient.channels.fetch(channelId);
      if (!channel?.isTextBased() || !('send' in channel)) {
        console.error(`[DiscordMessenger] Invalid channel: ${channelId}`);
        return false;
      }
      
      const intro = introText || this.getDefaultIntro(conversationType);
      await channel.send(intro);
      
      console.log(`[DiscordMessenger] Sent intro for ${conversationType} to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Error sending intro:`, error);
      return false;
    }
  }
  
  // Send outro message from TheAF
  async sendOutro(
    channelId: string,
    conversationType: string,
    outroText?: string
  ): Promise<boolean> {
    try {
      if (!this.discordClient) {
        console.error('[DiscordMessenger] Discord client not set');
        return false;
      }
      
      const channel = await this.discordClient.channels.fetch(channelId);
      if (!channel?.isTextBased() || !('send' in channel)) {
        console.error(`[DiscordMessenger] Invalid channel: ${channelId}`);
        return false;
      }
      
      const outro = outroText || this.getDefaultOutro(conversationType);
      await channel.send(outro);
      
      console.log(`[DiscordMessenger] Sent outro for ${conversationType} to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Error sending outro:`, error);
      return false;
    }
  }
  
  // Get coach configuration based on ID
  private getCoachConfig(coachId: string): CoachIdentity | null {
    // Mapping of coach IDs to their full configuration
    const coaches: Record<string, CoachIdentity> = {
      'donte': {
        name: 'Donte Disrupt',
        username: 'DonteDisrupt',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864296997105684/c7e0981f85bac6dd8b0ff8a366fe78d7.webp',
        webhookEnvVar: 'FR_WEBHOOK_DONTE'
      },
      'alex': {
        name: 'Alex Monroe',
        username: 'AlexMonroe',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864370149351575/e43a1ecff99f09661f1c16b369f8c128.webp',
        webhookEnvVar: 'FR_WEBHOOK_ALEX'
      },
      'rohan': {
        name: 'Rohan Shah',
        username: 'RohanTheShark',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864433399373925/c42ef0f4d29e5999d0a8aa248727325e.webp',
        webhookEnvVar: 'FR_WEBHOOK_ROHAN'
      },
      'eljas': {
        name: 'Eljas Aalto',
        username: 'EljasAalto',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864498620158033/ad52d9d7c6cdc44e63ea33e192b41a61.webp',
        webhookEnvVar: 'FR_WEBHOOK_ELJAS'
      },
      'kailey': {
        name: 'Kailey Burns',
        username: 'KaileyBurns',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864566479831082/c17f2a34cfb9ed73d0e1f7e67b8e8a2c.webp',
        webhookEnvVar: 'FR_WEBHOOK_KAILEY'
      },
      'venus': {
        name: 'Venus Metrics',
        username: 'VenusMetrics',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864642627182672/2c9da523ec45f86fda0caf5bf33077a1.webp',
        webhookEnvVar: 'FR_WEBHOOK_VENUS'
      }
    };
    
    return coaches[coachId.toLowerCase()] || null;
  }
  
  // Get default intro text for a conversation type
  private getDefaultIntro(conversationType: string): string {
    const intros: Record<string, string> = {
      'forreal': 'The coaches are gathering for a serious board meeting.',
      // Other conversation types can be added here later
    };
    
    return intros[conversationType] || 'A new conversation begins.';
  }
  
  // Get default outro text for a conversation type
  private getDefaultOutro(conversationType: string): string {
    const outros: Record<string, string> = {
      'forreal': 'The coaches have concluded their board meeting.',
      // Other conversation types can be added here later
    };
    
    return outros[conversationType] || 'The conversation has ended.';
  }
  
  // Not needed anymore as we're using the client directly
  // private getSystemAvatarUrl(): string {
  //  return 'https://cdn.discordapp.com/avatars/1121864207613673573/1c69e5ca1a86ba0b1db41f3a6305fb87.webp';
  //}
  
  // Get the appropriate channel ID for a conversation type
  getChannelIdForConversationType(conversationType: string, defaultChannelId: string): string {
    const channelMap: Record<string, string> = {
      'watercooler': process.env.LOUNGE_CHANNEL_ID || '',
      'forreal': '1378515740235399178', // Dedicated channel for ForReal conversations
      // Other mappings can be added here later
    };
    
    return channelMap[conversationType] || defaultChannelId;
  }
  
  // Send a plain text message to a channel
  async sendToChannel(channelId: string, message: string): Promise<boolean> {
    try {
      if (!this.discordClient) {
        console.error('[DiscordMessenger] Discord client not set');
        return false;
      }
      
      const channel = await this.discordClient.channels.fetch(channelId);
      if (!channel?.isTextBased() || !('send' in channel)) {
        console.error(`[DiscordMessenger] Invalid channel: ${channelId}`);
        return false;
      }
      
      await channel.send(message);
      
      console.log(`[DiscordMessenger] Sent message to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Error sending message to channel:`, error);
      return false;
    }
  }
}
