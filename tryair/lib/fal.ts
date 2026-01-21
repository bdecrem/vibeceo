/**
 * FAL.ai client for image generation and lipsync
 *
 * Models:
 * - Nano Banana Pro: Fast image generation from prompts
 * - InfiniteTalk: Lipsync video from face image + audio
 */

import { requireEnv } from './env.js';

const FAL_BASE_URL = 'https://queue.fal.run';

function getFalKey(): string {
  return requireEnv('FAL_API_KEY_ISIS');
}

interface FalQueueResponse {
  request_id: string;
  status: string;
}

interface FalStatusResponse<T> {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
  result?: T;
  error?: string;
}

// =============================================================================
// Generic FAL Queue Helpers
// =============================================================================

async function submitToQueue(model: string, payload: Record<string, unknown>): Promise<string> {
  const apiKey = getFalKey();

  const response = await fetch(`${FAL_BASE_URL}/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FAL API error (${model}): ${response.status} ${error}`);
  }

  const result: FalQueueResponse = await response.json();
  return result.request_id;
}

async function pollForResult<T>(model: string, requestId: string, maxWaitMs = 300000): Promise<T> {
  const apiKey = getFalKey();
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    // Step 1: Check status endpoint
    const statusResponse = await fetch(`${FAL_BASE_URL}/${model}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      throw new Error(`FAL status error: ${statusResponse.status} ${error}`);
    }

    const statusData = await statusResponse.json();
    console.log(`   Status: ${statusData.status}`);

    if (statusData.status === 'IN_QUEUE' || statusData.status === 'IN_PROGRESS') {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }

    if (statusData.status === 'FAILED') {
      throw new Error(`FAL job failed: ${statusData.error || 'Unknown error'}`);
    }

    if (statusData.status === 'COMPLETED') {
      // Step 2: Fetch the actual result from response_url
      const resultResponse = await fetch(`${FAL_BASE_URL}/${model}/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      });

      if (!resultResponse.ok) {
        const error = await resultResponse.text();
        throw new Error(`FAL result error: ${resultResponse.status} ${error}`);
      }

      return await resultResponse.json() as T;
    }

    // Unknown status, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`FAL job timed out after ${maxWaitMs / 1000}s`);
}

// =============================================================================
// Nano Banana Pro - Image Generation
// =============================================================================

interface NanoBananaResult {
  images: Array<{ url: string }>;
}

export interface NanoBananaOptions {
  prompt: string;
  imageSize?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
  numImages?: number;
}

export async function generateImageFal(options: NanoBananaOptions): Promise<string> {
  const { prompt, imageSize = 'square_hd', numImages = 1 } = options;

  console.log('   Submitting to Nano Banana Pro...');
  const requestId = await submitToQueue('fal-ai/nano-banana-pro', {
    prompt,
    image_size: imageSize,
    num_images: numImages,
  });

  console.log(`   Request ID: ${requestId}`);
  console.log('   Waiting for image generation...');

  const result = await pollForResult<NanoBananaResult>('fal-ai/nano-banana-pro', requestId);

  if (!result.images || result.images.length === 0) {
    throw new Error('No images in Nano Banana Pro response');
  }

  return result.images[0].url;
}

// =============================================================================
// Infinitalk - Lipsync Video (image + audio → talking video)
// =============================================================================

interface InfinitalkResult {
  video: { url: string };
  seed?: number;
}

export interface InfinitalkOptions {
  imageUrl: string;
  audioUrl: string;
  prompt?: string;
  numFrames?: number;
  resolution?: '480p' | '720p';
}

export async function generateLipsync(options: InfinitalkOptions): Promise<string> {
  const {
    imageUrl,
    audioUrl,
    prompt = 'A person speaking naturally with expressive facial movements',
    numFrames = 145,
    resolution = '480p',
  } = options;

  console.log('   Submitting to Infinitalk...');
  const requestId = await submitToQueue('fal-ai/infinitalk', {
    image_url: imageUrl,
    audio_url: audioUrl,
    prompt,
    num_frames: numFrames,
    resolution,
  });

  console.log(`   Request ID: ${requestId}`);
  console.log('   Waiting for lipsync video (this may take a while)...');

  const result = await pollForResult<InfinitalkResult>('fal-ai/infinitalk', requestId, 600000); // 10 min timeout

  if (!result.video || !result.video.url) {
    throw new Error('No video in Infinitalk response');
  }

  return result.video.url;
}

// =============================================================================
// Utility: Download URL to Buffer
// =============================================================================

export async function downloadUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
