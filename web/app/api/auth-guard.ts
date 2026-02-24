/**
 * Claudio API Auth Guard
 * 
 * All Claudio-facing endpoints require Bearer token auth.
 * Token is set via CLAUDIO_API_TOKEN env var.
 */
import { NextRequest } from 'next/server';

const TOKEN = process.env.CLAUDIO_API_TOKEN;

export function checkAuth(request: NextRequest): Response | null {
  if (!TOKEN) {
    // No token configured = open (dev mode)
    return null;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Authorization required' }, { status: 401 });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || token !== TOKEN) {
    return Response.json({ error: 'Invalid token' }, { status: 403 });
  }

  return null; // Auth passed
}
