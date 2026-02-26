/**
 * POST /api/tts
 * TTS proxy — keeps API keys server-side.
 * Supports both Hume and ElevenLabs. Set TTS_PROVIDER env var to switch.
 * 
 * Request:  { "text": "Hello world", "agent": "mave" }
 * Response: audio/mpeg binary (mp3)
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '../auth-guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TTS_PROVIDER = (process.env.TTS_PROVIDER || 'hume').toLowerCase();
const HUME_API_KEY = process.env.HUME_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

const HUME_VOICES: Record<string, { provider: string; name: string }> = {
  mave: { provider: 'HUME_AI', name: 'ITO' },
};

const ELEVENLABS_VOICES: Record<string, string> = {
  mave: 'pNInz6obpgDQGcFmaJgB',
};

async function humeGenerate(text: string, agent: string): Promise<Buffer> {
  const voice = HUME_VOICES[agent] || HUME_VOICES.mave;
  const resp = await fetch('https://api.hume.ai/v0/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hume-Api-Key': HUME_API_KEY,
    },
    body: JSON.stringify({
      utterances: [{ text, voice }],
      format: { type: 'mp3' },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Hume ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const audioBase64 = data.generations?.[0]?.audio;
  if (!audioBase64) throw new Error('No audio in Hume response');
  return Buffer.from(audioBase64, 'base64');
}

async function elevenlabsGenerate(text: string, agent: string): Promise<Buffer> {
  const voiceId = ELEVENLABS_VOICES[agent] || ELEVENLABS_VOICES.mave;
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ElevenLabs ${resp.status}: ${err.slice(0, 200)}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const text = body.text;
    const agent = (body.agent || 'mave').toLowerCase();

    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'text field required' }, { status: 400 });
    }

    const audioBuffer = TTS_PROVIDER === 'elevenlabs'
      ? await elevenlabsGenerate(text, agent)
      : await humeGenerate(text, agent);

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[tts] error:', error.message);
    return Response.json({ error: 'TTS failed' }, { status: 502 });
  }
}
