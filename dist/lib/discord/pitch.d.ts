import { Message } from 'discord.js';
import { Client } from 'discord.js';
export declare function triggerPitchChat(channelId: string, client: Client): Promise<void>;
export declare function handlePitchCommand(message: Message, idea: string): Promise<void>;
