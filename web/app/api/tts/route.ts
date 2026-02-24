/**
 * POST /api/tts
 * TTS proxy — keeps Hume API key server-side.
 * 
 * Request:  { "text": "Hello world", "agent": "mave" }
 * Response: audio/mpeg binary (mp3)
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '../auth-guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HUME_API_KEY = process.env.HUME_API_KEY || 'oSCMTs2HVD3kTy6QUCSJqFVWn0OSRWcG0qcbt2WcbZpmMpWH';

const AGENT_VOICES: Record<string, { provider: string; name: string }> = {
  mave: { provider: 'HUME_AI', name: 'ITO' },
};

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

    const voice = AGENT_VOICES[agent] || AGENT_VOICES.mave;

    const humeBody: any = {
      utterances: [{ text, voice }],
      format: { type: 'mp3' },
    };

    const resp = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hume-Api-Key': HUME_API_KEY,
      },
      body: JSON.stringify(humeBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[tts] Hume error (${resp.status}):`, errText.slice(0, 200));
      return Response.json({ error: 'TTS failed' }, { status: 502 });
    }

    const data = await resp.json();
    const audioBase64 = data.generations?.[0]?.audio;

    if (!audioBase64) {
      return Response.json({ error: 'No audio in response' }, { status: 502 });
    }

    // Return raw mp3 binary
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[tts] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
