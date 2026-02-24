/**
 * GET /api/voice/config
 * Returns Hume EVI config for the iPhone app to initialize voice mode.
 * API key stays server-side until the app requests it.
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '../../auth-guard';

export const dynamic = 'force-dynamic';

const HUME_API_KEY = process.env.HUME_API_KEY || '';
const MAVE_EVI_CONFIG_ID = '31f6299f-3b16-4cbe-81b7-40dd13050644';

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  return Response.json({
    configId: MAVE_EVI_CONFIG_ID,
    apiKey: HUME_API_KEY,
  });
}
