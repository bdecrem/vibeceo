import { WebhookClient, Client } from 'discord.js';

// Channel Registry - centralized channel ID management
interface ChannelRegistry {
  general: string;
  alexirVip: string;
  staff: string;
  lounge: string;
  pitch: string;
  forreal: string;
}

// Standard Message Handler Protocol - Export for use by other modules
export interface MessageStep {
  sender: string;                    // 'theaf', coach ID, or webhook ID like 'foundryheat'
  content: string;                   // The message content
  channelId: string | keyof ChannelRegistry; // Target channel ID or registry key
  delay?: number;                    // Optional delay in ms before sending
  useChannelMC?: string;            // Optional: Use specific ChannelMC webhook instead of TheAF
}

export interface MessageSequence {
  intro?: MessageStep;      // Optional intro message (usually from TheAF)
  main: MessageStep;        // Main content message
  outro?: MessageStep;      // Optional outro message
  crossPosts?: MessageStep[]; // Optional cross-posts to other channels
}

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
  private channelRegistry: ChannelRegistry;
  
  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.envSource = this.isProduction ? 'Railway environment' : '.env.local file';
    
    // Initialize channel registry with known channel IDs
    this.channelRegistry = {
      general: '1354474492629618831',       // #general
      alexirVip: '1376959208263520287',     // #alexir-vip-confessionals
      staff: '1369356692428423240',         // #staff-meetings
      lounge: process.env.THELOUNGE_CHANNEL_ID || '1372624901961420931', // #thelounge
      pitch: process.env.PITCH_CHANNEL_ID || '1372625148938813550',      // #pitch
      forreal: '1378515740235399178'        // #forreal
    };
    
    console.log(`[DiscordMessenger] Initialized channel registry:`, this.channelRegistry);
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

  // Resolve channel ID from registry key or return as-is if it's already an ID
  private resolveChannelId(channelIdOrKey: string | keyof ChannelRegistry): string {
    // If it's a registry key, resolve it
    if (channelIdOrKey in this.channelRegistry) {
      const resolved = this.channelRegistry[channelIdOrKey as keyof ChannelRegistry];
      console.log(`[DiscordMessenger] Resolved channel key '${channelIdOrKey}' to ID: ${resolved}`);
      return resolved;
    }
    
    // If it looks like a Discord channel ID (18-19 digit number), use as-is
    if (/^\d{17,19}$/.test(channelIdOrKey)) {
      console.log(`[DiscordMessenger] Using provided channel ID: ${channelIdOrKey}`);
      return channelIdOrKey;
    }
    
    // Invalid format
    throw new Error(`Invalid channel identifier: '${channelIdOrKey}'. Must be a registry key (${Object.keys(this.channelRegistry).join(', ')}) or a valid Discord channel ID.`);
  }

  // Get channel registry for external access
  getChannelRegistry(): Readonly<ChannelRegistry> {
    return { ...this.channelRegistry };
  }

  // Update channel registry (for dynamic updates)
  updateChannelId(key: keyof ChannelRegistry, channelId: string): void {
    if (!/^\d{17,19}$/.test(channelId)) {
      throw new Error(`Invalid Discord channel ID format: ${channelId}`);
    }
    this.channelRegistry[key] = channelId;
    console.log(`[DiscordMessenger] Updated channel registry: ${key} = ${channelId}`);
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

  // STANDARD PROTOCOL: Execute a complete message sequence
  async executeMessageSequence(sequence: MessageSequence): Promise<boolean> {
    try {
      console.log(`[DiscordMessenger] Executing message sequence with ${sequence.crossPosts?.length || 0} cross-posts`);
      
      let allSuccessful = true;

      // Get all unique channels that will receive content (main + cross-posts)
      const crossPostChannels = new Set<string>();
      if (sequence.crossPosts) {
        sequence.crossPosts.forEach(cp => {
          const resolvedChannelId = this.resolveChannelId(cp.channelId);
          crossPostChannels.add(resolvedChannelId);
        });
      }

      console.log(`[DiscordMessenger] Cross-post channels detected:`, Array.from(crossPostChannels));

      // Step 1: Send intro message to main channel AND all cross-post channels (if provided)
      if (sequence.intro) {
        console.log(`[DiscordMessenger] Sending intro to main channel: ${sequence.intro.channelId}`);
        
        // Send to main channel
        const mainIntroSuccess = await this.sendMessage(sequence.intro);
        if (!mainIntroSuccess) {
          console.error(`[DiscordMessenger] Failed to send intro message to main channel ${sequence.intro.channelId}`);
          allSuccessful = false;
        } else {
          console.log(`[DiscordMessenger] Successfully sent intro to main channel ${sequence.intro.channelId}`);
        }

        // Auto-send intro to all cross-post channels
        const mainChannelId = this.resolveChannelId(sequence.intro.channelId);
        for (const channelId of crossPostChannels) {
          if (channelId !== mainChannelId) { // Don't duplicate if it's the same channel
            console.log(`[DiscordMessenger] Sending intro to cross-post channel: ${channelId}`);
            
            try {
              const introForCrossPost = {
                ...sequence.intro,
                channelId: channelId
              };
              
              // Add a small delay before sending to cross-post channel
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const success = await this.sendMessage(introForCrossPost);
              if (!success) {
                console.error(`[DiscordMessenger] FAILED to send intro to cross-post channel ${channelId}`);
                allSuccessful = false;
              } else {
                console.log(`[DiscordMessenger] SUCCESS: Sent intro to cross-post channel ${channelId}`);
              }
            } catch (error) {
              console.error(`[DiscordMessenger] ERROR sending intro to cross-post channel ${channelId}:`, error);
              allSuccessful = false;
            }
          } else {
            console.log(`[DiscordMessenger] Skipping intro to ${channelId} (same as main channel)`);
          }
        }
        
        // Small delay between intro and main message
        if (sequence.intro.delay || 500) {
          await new Promise(resolve => setTimeout(resolve, sequence.intro!.delay || 500));
        }
      }

      // Step 2: Send main message
      const mainSuccess = await this.sendMessage(sequence.main);
      if (!mainSuccess) {
        console.error(`[DiscordMessenger] Failed to send main message`);
        allSuccessful = false;
      }

      // Step 3: Send outro message to main channel AND all cross-post channels (if provided)
      if (sequence.outro) {
        if (sequence.outro.delay || 300) {
          await new Promise(resolve => setTimeout(resolve, sequence.outro!.delay || 300));
        }
        
        // Send to main channel
        const mainOutroSuccess = await this.sendMessage(sequence.outro);
        if (!mainOutroSuccess) {
          console.error(`[DiscordMessenger] Failed to send outro message to main channel`);
          allSuccessful = false;
        }

        // Auto-send outro to all cross-post channels
        const mainOutroChannelId = this.resolveChannelId(sequence.outro.channelId);
        for (const channelId of crossPostChannels) {
          if (channelId !== mainOutroChannelId) { // Don't duplicate if it's the same channel
            try {
              const outroForCrossPost = {
                ...sequence.outro,
                channelId: channelId
              };
              const success = await this.sendMessage(outroForCrossPost);
              if (!success) {
                console.error(`[DiscordMessenger] Failed to send outro to cross-post channel ${channelId}`);
              } else {
                console.log(`[DiscordMessenger] Successfully sent outro to cross-post channel ${channelId}`);
              }
            } catch (error) {
              console.error(`[DiscordMessenger] Error sending outro to cross-post channel ${channelId}:`, error);
            }
          }
        }
      }

      // Step 4: Send cross-posts (now just the main content, since intro/outro are auto-handled)
      if (sequence.crossPosts && sequence.crossPosts.length > 0) {
        for (const crossPost of sequence.crossPosts) {
          try {
            if (crossPost.delay) {
              await new Promise(resolve => setTimeout(resolve, crossPost.delay!));
            }
            
            const success = await this.sendMessage(crossPost);
            if (!success) {
              console.error(`[DiscordMessenger] Failed to send cross-post to ${crossPost.channelId}`);
            } else {
              console.log(`[DiscordMessenger] Successfully cross-posted to ${crossPost.channelId}`);
            }
          } catch (error) {
            console.error(`[DiscordMessenger] Cross-post error:`, error);
            // Continue with other cross-posts even if one fails
          }
        }
      }

      console.log(`[DiscordMessenger] Message sequence completed. Overall success: ${allSuccessful}`);
      return allSuccessful;
    } catch (error) {
      console.error(`[DiscordMessenger] Error executing message sequence:`, error);
      return false;
    }
  }

  // Send a single message step
  private async sendMessage(step: MessageStep): Promise<boolean> {
    try {
      // Resolve channel ID first
      const channelId = this.resolveChannelId(step.channelId);
      
      if (step.sender === 'theaf') {
        if (step.useChannelMC) {
          // Use specific ChannelMC webhook instead of TheAF
          return await this.sendAsCoach(channelId, step.useChannelMC, step.content);
        } else {
          // Default: Send as TheAF system message
          return await this.sendToChannel(channelId, step.content);
        }
      } else {
        // Send as coach/webhook - create new step with resolved channel ID
        const resolvedStep = { ...step, channelId };
        return await this.sendAsCoach(resolvedStep.channelId, step.sender, step.content);
      }
    } catch (error) {
      console.error(`[DiscordMessenger] Error sending message from ${step.sender}:`, error);
      return false;
    }
  }

  // LEGACY METHOD: Send micropost (now uses standard protocol)
  async sendMicropost(
    mainChannelId: string,
    micropostType: string,
    content: string,
    contentIntro?: string,
    outro?: string
  ): Promise<boolean> {
    // Build the main FoundryHeat message with contentIntro + content + outro
    let mainMessage = content.trim();
    if (contentIntro && contentIntro.trim() !== '') {
      mainMessage = `${contentIntro.trim()}\n${mainMessage}`;
    }
    if (outro && outro.trim() !== '') {
      mainMessage = `${mainMessage}${outro}`;
    }

    // Convert to standard protocol
    const sequence: MessageSequence = {
      main: {
        sender: 'foundryheat',
        content: mainMessage,
        channelId: mainChannelId
      }
    };

    // Add cross-post for alextipsy (with full content)
    if (micropostType === 'alextipsy') {
      sequence.crossPosts = [{
        sender: 'alexirvip',
        content: mainMessage, // Same full content as main message
        channelId: 'alexirVip', // Use registry key
        delay: 1000
      }];
    }

    // NOTE: TheAF intro (location/time) should be handled separately by the event system
    // The contentIntro (like "🍷 Alexir VIP Confessionals:") stays with FoundryHeat

    return await this.executeMessageSequence(sequence);
  }

  // CONVENIENCE METHOD: For ForReal conversations
  async sendForRealSequence(
    channelId: string,
    introText: string,
    coachMessages: Array<{ coachId: string; message: string; delay?: number }>,
    outroText?: string
  ): Promise<boolean> {
    const sequence: MessageSequence = {
      intro: {
        sender: 'theaf',
        content: introText,
        channelId: channelId
      },
      main: {
        sender: coachMessages[0].coachId,
        content: coachMessages[0].message,
        channelId: channelId
      }
    };

    // Add outro if provided
    if (outroText) {
      sequence.outro = {
        sender: 'theaf',
        content: outroText,
        channelId: channelId
      };
    }

    // Add additional coach messages as cross-posts
    if (coachMessages.length > 1) {
      sequence.crossPosts = coachMessages.slice(1).map(msg => ({
        sender: msg.coachId,
        content: msg.message,
        channelId: channelId,
        delay: msg.delay || 2000
      }));
    }

    return await this.executeMessageSequence(sequence);
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
      },
      'foundryheat': {
        name: 'Foundry Heat',
        username: 'FoundryHeat',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864207613673573/1c69e5ca1a86ba0b1db41f3a6305fb87.webp',
        webhookEnvVar: 'GENERAL_WEBHOOK_URL_FOUNDRYHEAT'
      },
      'alexirvip': {
        name: 'Alex Monroe', 
        username: 'AlexMonroe',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1121864370149351575/e43a1ecff99f09661f1c16b369f8c128.webp',
        webhookEnvVar: 'ALEXIR_VIP_WEBHOOK_URL'
      },
      // Optional Channel MCs
      'forealthough-mc': {
        name: 'AF Mod',
        username: 'AFMod',
        avatarUrl: 'https://cdn.discordapp.com/avatars/1381280877245497595/7def7316030ef6594a30499d231ec67f.webp',
        webhookEnvVar: 'FOREALTHOUGH_MC_WEBHOOK_URL'
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
      console.log(`[DiscordMessenger] Attempting to send message to channel ${channelId}`);
      
      if (!this.discordClient) {
        console.error('[DiscordMessenger] Discord client not set');
        return false;
      }
      
      console.log(`[DiscordMessenger] Fetching channel ${channelId}...`);
      const channel = await this.discordClient.channels.fetch(channelId);
      
      if (!channel) {
        console.error(`[DiscordMessenger] Channel ${channelId} not found`);
        return false;
      }
      
      if (!channel.isTextBased()) {
        console.error(`[DiscordMessenger] Channel ${channelId} is not text-based`);
        return false;
      }
      
      if (!('send' in channel)) {
        console.error(`[DiscordMessenger] Channel ${channelId} does not have send method`);
        return false;
      }
      
      console.log(`[DiscordMessenger] Sending message to channel ${channelId}: "${message.substring(0, 50)}..."`);
      await channel.send(message);
      
      console.log(`[DiscordMessenger] Successfully sent TheAF message to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`[DiscordMessenger] Error sending message to channel ${channelId}:`, error);
      return false;
    }
  }
}

/*
DISCORD MESSAGE HANDLER - CENTRALIZED CHANNEL MANAGEMENT

✅ PROBLEM SOLVED: No more hardcoded channel IDs scattered everywhere!

CHANNEL REGISTRY KEYS:
- 'general'    → #general (1354474492629618831)
- 'alexirVip'  → #alexir-vip-confessionals (1376959208263520287) 
- 'staff'      → #staff-meetings (1369356692428423240)
- 'lounge'     → #thelounge (from env or default)
- 'pitch'      → #pitch (from env or default)
- 'forreal'    → #forreal (1378515740235399178)

USAGE EXAMPLES:

1. Weekend MicroPosts with auto cross-posting:
```typescript
const sequence: MessageSequence = {
  intro: { sender: 'theaf', content: 'Location info...', channelId: 'general' },
  main: { sender: 'foundryheat', content: 'Main content...', channelId: 'general' },
  crossPosts: [{ sender: 'alexirvip', content: 'Full content...', channelId: 'alexirVip' }]
};
// Handler automatically sends intro to BOTH general AND alexirVip!
```

2. ForReal Conversations:
```typescript
const sequence: MessageSequence = {
  intro: { sender: 'theaf', content: 'Meeting begins...', channelId: 'forreal' },
  main: { sender: 'donte', content: 'First message...', channelId: 'forreal' },
  crossPosts: [
    { sender: 'alex', content: 'Second message...', channelId: 'forreal', delay: 2000 }
  ]
};
```

3. Staff Meetings:
```typescript
const sequence: MessageSequence = {
  main: { sender: 'venus', content: 'Analytics report...', channelId: 'staff' },
  outro: { sender: 'theaf', content: 'Meeting ended.', channelId: 'staff' }
};
```

4. Dynamic Channel Management:
```typescript
const messenger = DiscordMessenger.getInstance();

// Get current registry
const registry = messenger.getChannelRegistry();

// Update a channel ID
messenger.updateChannelId('lounge', '1234567890123456789');

// Use raw channel IDs if needed (auto-validated)
const sequence: MessageSequence = {
  main: { sender: 'alex', content: 'Test...', channelId: '1354474492629618831' }
};
```

BENEFITS:
✅ Centralized channel ID management
✅ Use friendly keys instead of raw IDs
✅ Automatic validation of channel IDs  
✅ Auto-send intros/outros to ALL channels with content
✅ No more hardcoded IDs in individual files
✅ Easy to update channel IDs in one place
✅ Supports both registry keys and raw IDs
✅ Runtime validation and helpful error messages

MIGRATION GUIDE:
Old: channelId: '1354474492629618831'
New: channelId: 'general'

Old: Hard-coded cross-post intro duplication
New: Handler automatically sends intros to all channels
*/
