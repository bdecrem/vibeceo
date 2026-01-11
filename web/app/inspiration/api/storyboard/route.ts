import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT_TEMPLATE = `You are a creative director creating a storyboard for a short video ad. The video is approximately 20 seconds with TWO scenes.

Video topic/theme: {subject}

For each scene, provide:
1. NARRATION - What the voiceover says (10 sec / ~25-30 words per scene)
2. IMAGE - A vivid description of what the visual should show (for an AI image generator)
3. OVERLAY - 1-3 punchy words to display on screen

Guidelines:
- Narration: Conversational, punchy, spoken-word style
- Image descriptions: Concrete, visual, evocative - describe what we SEE, not abstract concepts
- Overlay text: Ultra-short, impactful - think billboard, not sentence

Output exactly this format:

SCENE 1:
NARRATION: [voiceover text - the hook/problem/setup]
IMAGE: [vivid visual description for AI image generator]
OVERLAY: [1-3 words]

SCENE 2:
NARRATION: [voiceover text - the payoff/solution/CTA]
IMAGE: [vivid visual description for AI image generator]
OVERLAY: [1-3 words]`;

interface Scene {
  narration: string;
  image: string;
  overlay: string;
}

interface Storyboard {
  scene1: Scene;
  scene2: Scene;
  fullNarration: string;
}

function parseScene(sceneText: string): Scene {
  const narrationMatch = sceneText.match(/NARRATION:\s*([\s\S]+?)(?=IMAGE:|$)/i);
  const imageMatch = sceneText.match(/IMAGE:\s*([\s\S]+?)(?=OVERLAY:|$)/i);
  const overlayMatch = sceneText.match(/OVERLAY:\s*([\s\S]+?)$/i);

  return {
    narration: narrationMatch ? narrationMatch[1].trim() : '',
    image: imageMatch ? imageMatch[1].trim() : '',
    overlay: overlayMatch ? overlayMatch[1].trim() : '',
  };
}

function parseStoryboardResponse(response: string): Storyboard {
  const scene1Match = response.match(/SCENE\s*1:\s*([\s\S]*?)(?=SCENE\s*2:|$)/i);
  const scene2Match = response.match(/SCENE\s*2:\s*([\s\S]*?)$/i);

  const scene1 = scene1Match ? parseScene(scene1Match[1]) : { narration: '', image: '', overlay: '' };
  const scene2 = scene2Match ? parseScene(scene2Match[1]) : { narration: '', image: '', overlay: '' };

  return {
    scene1,
    scene2,
    fullNarration: `${scene1.narration}\n\n${scene2.narration}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { topic, mode, style } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const prompt = PROMPT_TEMPLATE.replace('{subject}', topic);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const storyboard = parseStoryboardResponse(responseText);

    return NextResponse.json({
      topic,
      mode,
      style,
      storyboard,
      raw: responseText,
    });

  } catch (error) {
    console.error('Storyboard generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
