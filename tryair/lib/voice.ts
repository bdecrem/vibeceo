/**
 * Voice synthesis using Hume AI's Octave TTS
 */

import { HumeClient } from 'hume';
import { requireEnv } from './env.js';

// Default voice ID (warm podcast host style)
const DEFAULT_VOICE_ID = '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

export interface SynthesizeOptions {
  voiceId?: string;
  description?: string;  // Acting instructions
  speed?: number;        // 0.5 to 2.0
}

export interface SynthesizeResult {
  audioBuffer: Buffer;
  format: string;
  duration: number;
}

export async function synthesize(
  text: string,
  options: SynthesizeOptions = {}
): Promise<SynthesizeResult> {
  const apiKey = requireEnv('HUME_API_KEY');
  const client = new HumeClient({ apiKey });

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  // Build utterance
  const utterance: {
    text: string;
    voice?: { id: string };
    description?: string;
    speed?: number;
  } = {
    text,
  };

  if (voiceId) {
    utterance.voice = { id: voiceId };
  }

  if (options.description) {
    utterance.description = options.description;
  }

  if (options.speed !== undefined) {
    utterance.speed = Math.max(0.5, Math.min(2.0, options.speed));
  }

  console.log('Synthesizing audio with Hume...');

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

  console.log(`Audio generated: ${totalDuration.toFixed(1)}s, ${(audioBuffer.length / 1024).toFixed(1)} KB`);

  return {
    audioBuffer,
    format: 'mp3',
    duration: totalDuration,
  };
}
