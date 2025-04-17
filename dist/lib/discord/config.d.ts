export declare const DISCORD_CONFIG: {
    prefix: string;
    allowedChannels: string[];
    responses: {
        error: string;
        unknownCommand: string;
        noCharacterSelected: string;
    };
    cooldowns: {
        default: number;
        characterSelect: number;
    };
};
export declare function getWebhookUrls(): Record<string, string>;
export declare function validateConfig(): {
    token: string;
    webhookUrls: Record<string, string>;
};
