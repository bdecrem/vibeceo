import { NextRequest, NextResponse } from 'next/server';

const OPENAI_ORG_ID = 'org-3kZbACXqO0sjNiYNjj7AuRsR';

interface OpenAIImageResponse {
  created: number;
  data: Array<{ b64_json: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1536', quality = 'high' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Organization': OPENAI_ORG_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size,
        quality,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: 500 }
      );
    }

    const result: OpenAIImageResponse = await response.json();

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Return base64 image
    return NextResponse.json({
      image: result.data[0].b64_json,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
