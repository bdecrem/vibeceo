/**
 * Voice Provider Types
 *
 * Shared interfaces for TTS providers (ElevenLabs, Hume, etc.)
 */

export type VoiceProviderType = 'elevenlabs' | 'hume';

export interface SynthesizeOptions {
  /** Voice ID (provider-specific format) */
  voiceId?: string;

  /** Speaking speed (0.5-2.0, default 1.0) */
  speed?: number;

  /** Acting instructions / description (Hume-specific, affects delivery) */
  description?: string;

  /** ElevenLabs-specific: stability (0-1) */
  stability?: number;

  /** ElevenLabs-specific: similarity boost (0-1) */
  similarityBoost?: number;

  /** ElevenLabs-specific: style (0-1) */
  style?: number;

  // Backward compatibility with ElevenLabs snake_case naming
  /** @deprecated Use voiceId instead */
  voice_id?: string;

  /** @deprecated Use voiceId instead */
  voice?: string;

  /** @deprecated Use model in config instead */
  model?: string;

  /** @deprecated Use model in config instead */
  model_id?: string;

  /** @deprecated Use similarityBoost instead */
  similarity_boost?: number;

  /** @deprecated Use config instead */
  use_speaker_boost?: boolean;
}

export interface SynthesizeResult {
  /** Raw audio data */
  audioBuffer: Buffer;

  /** Audio format */
  format: 'mp3';

  /** Duration in seconds */
  duration: number;

  /** Which provider generated this */
  provider: VoiceProviderType;

  /** Provider-specific metadata */
  metadata?: {
    voiceId?: string;
    model?: string;
    charactersUsed?: number;
  };
}

export interface VoiceProvider {
  /** Synthesize text to speech */
  synthesize(text: string, options?: SynthesizeOptions): Promise<SynthesizeResult>;
}

export interface VoiceProviderConfig {
  /** API key (falls back to env var) */
  apiKey?: string;

  /** Default voice ID */
  voiceId?: string;

  /** Default model ID */
  model?: string;

  // Backward compatibility with ElevenLabs naming
  /** @deprecated Use voiceId instead */
  defaultVoice?: string;

  /** @deprecated Use model instead */
  defaultModel?: string;
}
