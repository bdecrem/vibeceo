export declare function initializeWebhooks(channelId: string, webhookUrls: Record<string, string>): Promise<void>;
export declare function sendAsCharacter(channelId: string, characterId: string, content: string): Promise<void>;
export declare function cleanupWebhooks(channelId: string): void;
