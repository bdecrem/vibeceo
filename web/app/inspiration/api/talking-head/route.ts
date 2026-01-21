import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HumeClient } from 'hume';
import { createClient } from '@supabase/supabase-js';

const FAL_BASE_URL = 'https://queue.fal.run';

// Helper to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// FAL.ai queue helpers
async function submitToFalQueue(model: string, payload: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.FAL_API_KEY_ISIS;
  if (!apiKey) throw new Error('FAL_API_KEY_ISIS not configured');

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
    throw new Error(`FAL API error: ${response.status} ${error}`);
  }

  const result = await response.json();
  return result.request_id;
}

async function pollFalResult<T>(model: string, requestId: string, maxWaitMs = 600000): Promise<T> {
  const apiKey = process.env.FAL_API_KEY_ISIS;
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await fetch(`${FAL_BASE_URL}/${model}/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });

    if (!statusResponse.ok) {
      throw new Error(`FAL status error: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(`${FAL_BASE_URL}/${model}/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      return await resultResponse.json() as T;
    }

    if (statusData.status === 'FAILED') {
      throw new Error(`FAL job failed: ${statusData.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('FAL job timed out');
}

export async function POST(request: NextRequest) {
  const { topic, imageBase64 } = await request.json();

  if (!topic || !imageBase64) {
    return new Response(JSON.stringify({ error: 'Topic and image are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Generate narration script from topic
        sendEvent(controller, { progress: 'Writing script...' });

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

        const claude = new Anthropic({ apiKey: anthropicKey });

        const scriptResponse = await claude.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Write a short, engaging 2-3 sentence narration for a talking head video about: "${topic}"

The narration should:
- Be conversational and engaging
- Take about 8-12 seconds to read aloud
- Sound natural when spoken
- Be informative but not preachy

Output ONLY the narration text, nothing else.`,
          }],
        });

        const narration = (scriptResponse.content[0] as { type: string; text: string }).text;
        console.log('Generated narration:', narration);

        // Step 2: Analyze speaker image with Claude
        sendEvent(controller, { progress: 'Analyzing speaker image...' });

        const imageResponse = await claude.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Generate a detailed image generation prompt for recreating this person's portrait. Focus on:
- Subject description (appearance, expression, clothing)
- Setting/background
- Lighting and mood
- Style (photorealistic, cinematic)

Output ONLY the prompt text, suitable for an AI image generator.`,
              },
            ],
          }],
        });

        const imagePrompt = (imageResponse.content[0] as { type: string; text: string }).text;
        console.log('Generated image prompt:', imagePrompt.slice(0, 100) + '...');

        // Step 3: Generate image with Nano Banana Pro
        sendEvent(controller, { progress: 'Generating AI image...' });

        const imageRequestId = await submitToFalQueue('fal-ai/nano-banana-pro', {
          prompt: imagePrompt,
          image_size: 'square_hd',
          num_images: 1,
        });

        const imageResult = await pollFalResult<{ images: Array<{ url: string }> }>(
          'fal-ai/nano-banana-pro',
          imageRequestId,
          120000
        );

        const generatedImageUrl = imageResult.images[0].url;
        console.log('Generated image URL:', generatedImageUrl);

        // Step 4: Generate audio with Hume TTS
        sendEvent(controller, { progress: 'Generating voiceover...' });

        const humeKey = process.env.HUME_API_KEY;
        if (!humeKey) throw new Error('HUME_API_KEY not configured');

        const hume = new HumeClient({ apiKey: humeKey });

        const ttsStream = await hume.tts.synthesizeJsonStreaming({
          utterances: [{
            text: narration,
            voice: { id: '5bbc32c1-a1f6-44e8-bedb-9870f23619e2' },
            description: 'Speak in a warm, engaging, conversational style. Natural pacing.',
          }],
        });

        const audioChunks: Buffer[] = [];
        for await (const chunk of ttsStream) {
          if (chunk.audio) {
            audioChunks.push(Buffer.from(chunk.audio, 'base64'));
          }
        }

        if (audioChunks.length === 0) throw new Error('No audio generated');
        const audioBuffer = Buffer.concat(audioChunks);

        // Step 5: Upload audio to Supabase to get URL
        sendEvent(controller, { progress: 'Uploading audio...' });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');

        const supabase = createClient(supabaseUrl, supabaseKey);

        const audioFileName = `talking-head-${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from('audio')
          .upload(audioFileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

        const { data: audioUrlData } = supabase.storage
          .from('audio')
          .getPublicUrl(audioFileName);

        const audioUrl = audioUrlData.publicUrl;
        console.log('Audio URL:', audioUrl);

        // Step 6: Generate lipsync video with Infinitalk
        sendEvent(controller, { progress: 'Creating lipsync video (this takes a few minutes)...' });

        // Calculate frames from narration length
        const wordCount = narration.split(/\s+/).length;
        const estimatedSeconds = Math.max(5, (wordCount / 2.5) + 1);
        const numFrames = Math.min(721, Math.ceil(estimatedSeconds * 30));

        const videoRequestId = await submitToFalQueue('fal-ai/infinitalk', {
          image_url: generatedImageUrl,
          audio_url: audioUrl,
          prompt: 'A person speaking naturally with expressive facial movements',
          num_frames: numFrames,
          resolution: '480p',
        });

        const videoResult = await pollFalResult<{ video: { url: string } }>(
          'fal-ai/infinitalk',
          videoRequestId,
          600000
        );

        const videoUrl = videoResult.video.url;
        console.log('Video URL:', videoUrl);

        // Success!
        sendEvent(controller, { progress: 'Done!', videoUrl });

      } catch (error) {
        console.error('Talking head error:', error);
        sendEvent(controller, { error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
