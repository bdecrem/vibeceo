/**
 * Hume EVI Access Token Endpoint
 *
 * Generates short-lived access tokens for browser-side Hume EVI connections.
 * Uses OAuth2 client credentials flow.
 * Tokens expire after 30 minutes and should be requested fresh for each session.
 */

import { NextResponse } from 'next/server';

const HUME_TOKEN_URL = 'https://api.hume.ai/oauth2-cc/token';

export async function GET() {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.error('Hume credentials not configured');
    return NextResponse.json(
      { error: 'Hume credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // OAuth2 client credentials flow
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

    const response = await fetch(HUME_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get Hume access token:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to generate access token' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in || 1800,  // Default 30 minutes
    });
  } catch (error) {
    console.error('Failed to generate Hume access token:', error);
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}
