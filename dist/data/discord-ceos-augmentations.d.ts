import type { CEO } from '../types/ceo';
/**
 * Discussion-specific augmentations for CEO characters
 * This file extends the base CEO type with discussion-specific behaviors
 * while maintaining the core character definitions from discord-ceos.ts
 */
export interface DiscussionCEO extends CEO {
    discussion: {
        verbalTics: string[];
        agreePhrases: string[];
        disagreePhrases: string[];
        topicResponses: {
            ai: string[];
            privacy: string[];
            bigTech: string[];
            general: string[];
        };
        role: 'skeptical' | 'supportive' | 'neutral';
    };
}
export declare const discussionAugmentations: Record<string, Omit<DiscussionCEO['discussion'], 'role'>>;
export declare function getDiscussionCEO(id: string): DiscussionCEO | undefined;
export declare function getSkepticalCEOs(): DiscussionCEO[];
