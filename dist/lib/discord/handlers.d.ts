import { Message } from 'discord.js';
import { Client } from 'discord.js';
export declare function triggerWatercoolerChat(channelId: string, client: Client): Promise<void>;
export declare function initializeScheduledTasks(channelId: string, client: Client): void;
export declare function handleMessage(message: Message): Promise<void>;
export declare function cleanup(): Promise<void>;
