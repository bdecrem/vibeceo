import { NextResponse } from 'next/server';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    const authString = `${apiKey}:${secretKey}`;
    const encoded = Buffer.from(authString).toString('base64');

    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encoded}`,
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    const data = await response.json();

    if (!data.access_token) {
      return NextResponse.json(
        { error: 'No access token in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accessToken: data.access_token });
  } catch (error) {
    return NextResponse.json(
      { error: 'Token generation failed' },
      { status: 500 }
    );
  }
}
