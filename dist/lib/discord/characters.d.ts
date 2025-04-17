import { Message } from 'discord.js';
interface CEO {
    id: string;
    name: string;
    prompt: string;
    character: string;
    style: string;
    image: string;
}
export declare function getCharacters(): CEO[];
export declare function getCharacter(id: string): CEO | undefined;
export declare function setActiveCharacter(channelId: string, characterId: string): CEO | undefined;
export declare function getActiveCharacter(channelId: string): CEO | undefined;
export declare function formatCharacterList(): string;
export declare function handleCharacterInteraction(message: Message): Promise<void>;
export {};
