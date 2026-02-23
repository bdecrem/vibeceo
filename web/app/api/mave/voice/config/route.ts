/**
 * Mave Voice Config
 *
 * Returns the EVI config ID for Mave voice chat.
 * Creates the config on first call, caches the ID.
 *
 * The CLM URL must be publicly accessible for Hume's servers to call it.
 * Set MAVE_VOICE_CLM_URL env var to the public URL of the CLM endpoint.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cache config ID in memory
let cachedConfigId: string | null = null;

export async function GET() {
  try {
    // If we have a pre-set config ID, use it
    const envConfigId = process.env.MAVE_VOICE_CONFIG_ID;
    if (envConfigId) {
      return NextResponse.json({ configId: envConfigId });
    }

    if (cachedConfigId) {
      return NextResponse.json({ configId: cachedConfigId });
    }

    // Create a new EVI config via Hume API
    const apiKey = process.env.HUME_API_KEY;
    const clmUrl = process.env.MAVE_VOICE_CLM_URL;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing HUME_API_KEY' }, { status: 500 });
    }

    if (!clmUrl) {
      return NextResponse.json({ error: 'Missing MAVE_VOICE_CLM_URL — set it to the public URL of the CLM endpoint' }, { status: 500 });
    }

    console.log('[mave-voice-config] Creating EVI config with CLM URL:', clmUrl);

    const resp = await fetch('https://api.hume.ai/v0/evi/configs', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `mave-voice-${Date.now()}`,
        language_model: {
          model_provider: 'CUSTOM_LANGUAGE_MODEL',
          custom_language_model: {
            url: clmUrl,
          },
        },
        voice: {
          provider: 'HUME_AI',
          name: 'Dacher',
        },
        ellm_model: {
          allow_short_responses: true,
        },
        event_messages: {
          on_new_chat: { enabled: false },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[mave-voice-config] Hume API error:', resp.status, errText);
      return NextResponse.json({ error: `Hume config creation failed: ${resp.status}` }, { status: 500 });
    }

    const config = await resp.json();
    cachedConfigId = config.id;
    console.log('[mave-voice-config] Created EVI config:', config.id);

    return NextResponse.json({ configId: config.id });
  } catch (error: any) {
    console.error('[mave-voice-config] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
