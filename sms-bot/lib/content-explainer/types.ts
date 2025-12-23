/**
 * Shared types for content-explainer module
 */

export type ContentType = 'twitter' | 'youtube' | 'article';
export type ExplanationLevel = 'beginner' | 'intermediate' | 'expert';

export interface FetchedContent {
  contentType: ContentType;
  externalId: string;
  title: string;
  author: string;
  url: string;
  rawContent: string;
  metadata?: Record<string, unknown>;
}

export interface ExplainerInput {
  url: string;
  subscriberId: string;
  userLevel?: ExplanationLevel;
  followUpQuestion?: string;
}

export interface ExplainerResult {
  contentType: ContentType;
  externalId: string;
  title: string;
  author: string;
  explanation: string;
  keyPoints: string[];
  rawContent: string;
}

export interface UserPreferences {
  explanation_level?: ExplanationLevel;
  expertise?: Record<string, number>; // topic -> confidence (0-1)
}
