/**
 * Audio Output Generator (Stub)
 * Future: Generate audio reports using OpenAI TTS
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

interface AudioConfig {
  voice?: string;
}

/**
 * Generate audio report (stub for future implementation)
 */
export async function generateAudio(
  items: NormalizedItem[],
  config: AudioConfig
): Promise<{ url: string | null }> {
  console.log(`🔊 Audio generation not yet implemented`);
  console.log(`   Skipping audio output`);

  // TODO: Future implementation
  // 1. Generate script from items
  // 2. Call OpenAI TTS API
  // 3. Upload audio to Supabase storage
  // 4. Return audio URL

  return { url: null };
}
