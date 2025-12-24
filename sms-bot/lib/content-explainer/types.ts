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
  /** Short 1-sentence summary for SMS */
  shortSummary: string;
  /** Full detailed explanation (markdown) for report */
  fullExplanation: string;
  keyPoints: string[];
  rawContent: string;
  /** Legacy field - same as fullExplanation for backwards compat */
  explanation: string;
}

export interface UserPreferences {
  explanation_level?: ExplanationLevel;
  expertise?: Record<string, number>; // topic -> confidence (0-1)
}
