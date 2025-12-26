/**
 * Voice Provider Factory
 *
 * Unified interface for TTS providers.
 *
 * Usage:
 *   import { getVoiceProvider } from '../lib/voice/index.js';
 *
 *   // Default (ElevenLabs)
 *   const voice = getVoiceProvider();
 *
 *   // Hume
 *   const voice = getVoiceProvider('hume', { voiceId: '...' });
 *
 *   // Synthesize
 *   const result = await voice.synthesize('Hello world');
 */

import type { VoiceProvider, VoiceProviderType, VoiceProviderConfig } from './types.js';
import { ElevenLabsProvider } from './elevenlabs.js';
import { HumeProvider } from './hume.js';

/**
 * Get a voice provider instance
 *
 * @param provider - Which provider to use (default: 'elevenlabs')
 * @param config - Provider-specific configuration
 */
export function getVoiceProvider(
  provider: VoiceProviderType = 'elevenlabs',
  config: VoiceProviderConfig = {}
): VoiceProvider {
  switch (provider) {
    case 'hume':
      return new HumeProvider(config);
    case 'elevenlabs':
    default:
      return new ElevenLabsProvider(config);
  }
}

// Re-export types
export type {
  VoiceProvider,
  VoiceProviderType,
  VoiceProviderConfig,
  SynthesizeOptions,
  SynthesizeResult,
} from './types.js';

// Re-export providers for direct use
export { ElevenLabsProvider } from './elevenlabs.js';
export { HumeProvider } from './hume.js';
