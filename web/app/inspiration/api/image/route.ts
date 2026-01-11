import { NextRequest, NextResponse } from 'next/server';

interface OpenAIImageResponse {
  created: number;
  data: Array<{ b64_json?: string; url?: string }>;
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

    // Use gpt-image-1.5 (latest model with best quality)
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1.5',
        prompt,
        n: 1,
        size,
        quality,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', response.status, error);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} - ${error}` },
        { status: 500 }
      );
    }

    const result: OpenAIImageResponse = await response.json();

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    const imageData = result.data[0];

    // If we got base64, return it directly
    if (imageData.b64_json) {
      return NextResponse.json({
        image: imageData.b64_json,
      });
    }

    // If we got a URL, fetch and convert to base64
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      return NextResponse.json({
        image: base64,
      });
    }

    return NextResponse.json({ error: 'No image data in response' }, { status: 500 });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
