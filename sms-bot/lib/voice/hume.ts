/**
 * Hume Voice Provider
 *
 * TTS synthesis using Hume AI's Octave model.
 * Supports voice IDs, descriptions (acting instructions), and speed control.
 */

import { HumeClient } from 'hume';
import type { VoiceProvider, VoiceProviderConfig, SynthesizeOptions, SynthesizeResult } from './types.js';

export class HumeProvider implements VoiceProvider {
  private readonly apiKey?: string;
  private readonly defaultVoiceId: string;
  private client: HumeClient | null = null;

  constructor(config: VoiceProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.HUME_API_KEY;
    this.defaultVoiceId = config.voiceId || process.env.HUME_VOICE_ID || '';
  }

  private getClient(): HumeClient {
    if (!this.apiKey) {
      throw new Error('Hume API key is not configured (HUME_API_KEY)');
    }

    if (!this.client) {
      this.client = new HumeClient({ apiKey: this.apiKey });
    }

    return this.client;
  }

  async synthesize(text: string, options: SynthesizeOptions = {}): Promise<SynthesizeResult> {
    const client = this.getClient();
    const voiceId = options.voiceId || this.defaultVoiceId;

    // Build utterance
    const utterance: {
      text: string;
      voice?: { id: string };
      description?: string;
      speed?: number;
    } = {
      text,
    };

    // Add voice ID if provided
    if (voiceId) {
      utterance.voice = { id: voiceId };
    }

    // Add acting instructions if provided
    if (options.description) {
      utterance.description = options.description;
    }

    // Add speed if provided (0.5-2.0)
    if (options.speed !== undefined) {
      utterance.speed = Math.max(0.5, Math.min(2.0, options.speed));
    }

    try {
      // Use streaming to collect all audio chunks
      const stream = await client.tts.synthesizeJsonStreaming({
        utterances: [utterance],
        stripHeaders: true,
      });

      // Collect all audio chunks
      const audioChunks: Buffer[] = [];
      let totalDuration = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'audio' && chunk.audio) {
          const buffer = Buffer.from(chunk.audio, 'base64');
          audioChunks.push(buffer);
        }

        // Try to capture duration if available
        if ('durationSeconds' in chunk && typeof chunk.durationSeconds === 'number') {
          totalDuration = chunk.durationSeconds;
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('Hume TTS returned no audio');
      }

      const audioBuffer = Buffer.concat(audioChunks);

      // Estimate duration if not provided (150 words per minute)
      if (totalDuration === 0) {
        const words = text.split(/\s+/).filter(Boolean).length;
        totalDuration = (words / 150) * 60;
      }

      return {
        audioBuffer,
        format: 'mp3',
        duration: totalDuration,
        provider: 'hume',
        metadata: {
          voiceId: voiceId || 'dynamic',
          charactersUsed: text.length,
        },
      };
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };

      if (err.status === 401 || err.message?.includes('401')) {
        throw new Error('Hume API key is invalid');
      }

      if (err.status === 404 || err.message?.includes('not found')) {
        throw new Error(`Hume voice not found: ${voiceId}`);
      }

      throw new Error(`Hume synthesis failed: ${err.message || String(error)}`);
    }
  }
}

export default HumeProvider;
