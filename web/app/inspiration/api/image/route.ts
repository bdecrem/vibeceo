import { NextRequest, NextResponse } from 'next/server';

// fal.ai model mapping
const FAL_MODELS: Record<string, string> = {
  'flux-dev': 'fal-ai/flux/dev',
  'flux-max': 'fal-ai/flux-pro/v1.1',
  'recraft-v3': 'fal-ai/recraft-v3',
  'nano-banana': 'fal-ai/nano-banana-pro',
};

// Size mapping for fal.ai (OpenAI format -> fal.ai format)
function mapSizeToFal(size: string): string {
  const mapping: Record<string, string> = {
    '1024x1024': 'square_hd',
    '1024x1536': 'portrait_4_3',
    '1536x1024': 'landscape_4_3',
  };
  return mapping[size] || 'square_hd';
}

interface FalImageResult {
  images: Array<{ url: string }>;
}

interface OpenAIImageResponse {
  created: number;
  data: Array<{ b64_json?: string; url?: string }>;
}

// Generate with fal.ai (synchronous API)
async function generateWithFal(prompt: string, model: string, size: string): Promise<string> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  const falModel = FAL_MODELS[model];
  if (!falModel) {
    throw new Error(`Unknown fal.ai model: ${model}`);
  }

  const falSize = mapSizeToFal(size);

  // Use synchronous endpoint (returns result directly)
  const response = await fetch(`https://fal.run/${falModel}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: falSize,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`fal.ai error: ${response.status} ${error}`);
  }

  const result: FalImageResult = await response.json();

  if (!result.images || result.images.length === 0) {
    throw new Error('No images in fal.ai response');
  }

  // Download and convert to base64
  const imageUrl = result.images[0].url;
  const imageRes = await fetch(imageUrl);
  const buffer = await imageRes.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// Generate with OpenAI gpt-image-1.5
async function generateWithOpenAI(prompt: string, size: string, quality: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

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
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result: OpenAIImageResponse = await response.json();

  if (!result.data || result.data.length === 0) {
    throw new Error('No image generated');
  }

  const imageData = result.data[0];

  if (imageData.b64_json) {
    return imageData.b64_json;
  }

  if (imageData.url) {
    const imageResponse = await fetch(imageData.url);
    const imageBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(imageBuffer).toString('base64');
  }

  throw new Error('No image data in response');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1536', quality = 'high', model = 'flux-dev' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let image: string;

    if (model === 'gpt-image-1.5') {
      // Use OpenAI
      image = await generateWithOpenAI(prompt, size, quality);
    } else {
      // Use fal.ai
      image = await generateWithFal(prompt, model, size);
    }

    return NextResponse.json({ image });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
