import { NextRequest, NextResponse } from 'next/server';
import { HumeClient } from 'hume';

// Default voice ID (warm podcast host style)
const DEFAULT_VOICE_ID = '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, description, speed } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.HUME_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'HUME_API_KEY not configured' }, { status: 500 });
    }

    const client = new HumeClient({ apiKey });

    // Build utterance
    const utterance: {
      text: string;
      voice?: { id: string };
      description?: string;
      speed?: number;
    } = {
      text,
      voice: { id: voiceId || DEFAULT_VOICE_ID },
    };

    if (description) {
      utterance.description = description;
    }

    if (speed !== undefined) {
      utterance.speed = Math.max(0.5, Math.min(2.0, speed));
    }

    // Use streaming to collect all audio chunks
    const stream = await client.tts.synthesizeJsonStreaming({
      utterances: [utterance],
    });

    // Collect all audio chunks
    const audioChunks: Buffer[] = [];
    let totalDuration = 0;

    for await (const chunk of stream) {
      // The chunk has audio property directly
      if (chunk.audio) {
        const buffer = Buffer.from(chunk.audio, 'base64');
        audioChunks.push(buffer);
      }

      // Try to capture duration if available
      if ('durationSeconds' in chunk && typeof (chunk as Record<string, unknown>).durationSeconds === 'number') {
        totalDuration = (chunk as Record<string, unknown>).durationSeconds as number;
      }
    }

    if (audioChunks.length === 0) {
      return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
    }

    const audioBuffer = Buffer.concat(audioChunks);

    // Estimate duration if not provided (150 words per minute)
    if (totalDuration === 0) {
      const words = text.split(/\s+/).filter(Boolean).length;
      totalDuration = (words / 150) * 60;
    }

    // Return base64 audio
    return NextResponse.json({
      audio: audioBuffer.toString('base64'),
      format: 'mp3',
      duration: totalDuration,
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
