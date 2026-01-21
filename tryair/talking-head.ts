#!/usr/bin/env npx tsx
/**
 * Talking Head Workflow
 *
 * Creates a lipsync video from an image + text using FAL.ai:
 * 1. Image → Claude describes it → JSON prompt
 * 2. Prompt → Nano Banana Pro → Generated image
 * 3. Image + Audio → InfiniteTalk → Lipsync video
 *
 * Usage:
 *   npx tsx talking-head.ts <image-path> <narration-text> [--audio-url <url>]
 *
 * Examples:
 *   # Generate image only (no lipsync)
 *   npx tsx talking-head.ts ./monk.jpg "A wise monk shares ancient wisdom"
 *
 *   # Full pipeline with hosted audio
 *   npx tsx talking-head.ts ./monk.jpg "Hello, I am here to share wisdom" --audio-url https://example.com/narration.mp3
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

import { loadEnv, requireEnv } from './lib/env.js';
import { generateImageFal, generateLipsync, downloadUrl } from './lib/fal.js';
import { synthesize } from './lib/voice.js';

loadEnv();

// =============================================================================
// Step 1: Describe Image with Claude
// =============================================================================

async function describeImage(imagePath: string): Promise<string> {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

  console.log('🔍 Analyzing image with Claude...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Generate a detailed image generation prompt for recreating this image. Focus on:
- Subject description (person, expression, clothing, pose)
- Setting/background
- Lighting and mood
- Style (photorealistic, cinematic, etc.)

Output ONLY the prompt text, no JSON or explanation. Make it suitable for an AI image generator.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

// =============================================================================
// Main Workflow
// =============================================================================

interface WorkflowOptions {
  imagePath: string;
  narration: string;
  audioUrl?: string;
  outputDir?: string;
}

async function runWorkflow(options: WorkflowOptions): Promise<void> {
  const { imagePath, narration, audioUrl, outputDir = './output' } = options;

  // Create output directory
  const timestamp = Date.now();
  const projectDir = path.join(outputDir, `talking-head-${timestamp}`);
  fs.mkdirSync(projectDir, { recursive: true });

  console.log(`\n📁 Project: ${projectDir}\n`);

  // Step 1: Describe the image
  console.log('Step 1/4: Analyzing source image...');
  const prompt = await describeImage(imagePath);
  console.log(`   Prompt: ${prompt.slice(0, 100)}...`);

  // Save prompt
  fs.writeFileSync(path.join(projectDir, 'prompt.txt'), prompt);

  // Step 2: Generate image with Nano Banana Pro
  console.log('\nStep 2/4: Generating image with Nano Banana Pro...');
  const generatedImageUrl = await generateImageFal({
    prompt,
    imageSize: 'square_hd',
  });
  console.log(`   Generated: ${generatedImageUrl}`);

  // Download and save the generated image
  const imageBuffer = await downloadUrl(generatedImageUrl);
  const imageSavePath = path.join(projectDir, 'generated.png');
  fs.writeFileSync(imageSavePath, imageBuffer);
  console.log(`   Saved: generated.png`);

  // Step 3: Generate audio (or use provided URL)
  let finalAudioUrl = audioUrl;

  if (!audioUrl) {
    console.log('\nStep 3/4: Generating narration audio with Hume...');
    const audioResult = await synthesize(narration, {
      description: 'Speak in a calm, wise, contemplative voice. Natural pacing.',
    });

    // Save audio locally
    const audioPath = path.join(projectDir, 'narration.mp3');
    fs.writeFileSync(audioPath, audioResult.audioBuffer);
    console.log(`   Saved: narration.mp3 (${audioResult.duration.toFixed(1)}s)`);

    // For InfiniteTalk, we need a URL. Print instructions.
    console.log('\n   ⚠️  Audio saved locally. To run lipsync, you need to host it.');
    console.log('   Options:');
    console.log('   1. Upload to Supabase storage');
    console.log('   2. Use a temp file host like file.io');
    console.log('   3. Run: npx tsx talking-head.ts <image> <text> --audio-url <hosted-url>');
    console.log(`\n   Local audio: file://${path.resolve(audioPath)}`);
  } else {
    console.log('\nStep 3/4: Using provided audio URL...');
    console.log(`   Audio: ${audioUrl}`);
    finalAudioUrl = audioUrl;
  }

  // Step 4: Generate lipsync video (if we have audio URL)
  if (finalAudioUrl) {
    console.log('\nStep 4/4: Generating lipsync video with Infinitalk...');
    // Calculate frames needed: ~30fps, add buffer. Max is 721 frames (~24s)
    // For now estimate from narration length (150 words/min = 2.5 words/sec)
    const wordCount = narration.split(/\s+/).length;
    const estimatedSeconds = Math.max(5, (wordCount / 2.5) + 1); // +1s buffer
    const numFrames = Math.min(721, Math.ceil(estimatedSeconds * 30));
    console.log(`   Estimated duration: ${estimatedSeconds.toFixed(1)}s → ${numFrames} frames`);

    const videoUrl = await generateLipsync({
      imageUrl: generatedImageUrl,
      audioUrl: finalAudioUrl,
      numFrames,
    });
    console.log(`   Video URL: ${videoUrl}`);

    // Download and save video
    const videoBuffer = await downloadUrl(videoUrl);
    const videoPath = path.join(projectDir, 'talking-head.mp4');
    fs.writeFileSync(videoPath, videoBuffer);
    console.log(`   Saved: talking-head.mp4`);
  } else {
    console.log('\nStep 4/4: Skipping lipsync (no audio URL)');
  }

  // Summary
  console.log('\n✅ Done!\n');
  console.log('Files:');
  console.log(`   - prompt.txt       (image description)`);
  console.log(`   - generated.png    (AI-generated image)`);
  if (!audioUrl) {
    console.log(`   - narration.mp3    (TTS audio)`);
  }
  if (finalAudioUrl) {
    console.log(`   - talking-head.mp4 (lipsync video)`);
  }
  console.log(`\n📂 Open: file://${path.resolve(projectDir)}\n`);
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Talking Head Generator - Create lipsync videos from images

Usage:
  npx tsx talking-head.ts <image-path> "<narration-text>" [options]

Options:
  --audio-url <url>   Use hosted audio URL for lipsync
  --help, -h          Show this help

Examples:
  # Generate image + local audio (no lipsync)
  npx tsx talking-head.ts monk.jpg "Wisdom comes from within"

  # Full pipeline with hosted audio
  npx tsx talking-head.ts monk.jpg "Hello world" --audio-url https://example.com/audio.mp3
`);
    process.exit(0);
  }

  const imagePath = args[0];
  const narration = args[1];

  // Parse --audio-url
  let audioUrl: string | undefined;
  const audioUrlIndex = args.indexOf('--audio-url');
  if (audioUrlIndex !== -1 && args[audioUrlIndex + 1]) {
    audioUrl = args[audioUrlIndex + 1];
  }

  // Validate image exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    process.exit(1);
  }

  await runWorkflow({
    imagePath,
    narration,
    audioUrl,
    outputDir: './projects',
  });
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
