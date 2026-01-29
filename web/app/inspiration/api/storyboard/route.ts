import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Prompt for Video mode (2 scenes)
const VIDEO_PROMPT = `You are a creative director creating a storyboard for a short video ad. The video is approximately 20 seconds with TWO scenes.

Video topic/theme: {subject}

Create TWO different creative directions (Comp A and Comp B) for this video. Both use the same narration but have different visual approaches.

For each comp, provide:
1. MOOD - A short description of the visual feeling (3-5 words)
2. SCENE 1 IMAGE - A detailed image prompt optimized for AI image generation
3. SCENE 1 OVERLAY - 1-3 punchy words to display on screen
4. SCENE 2 IMAGE - A detailed image prompt optimized for AI image generation
5. SCENE 2 OVERLAY - 1-3 punchy words to display on screen

Also provide the shared narration (split into scene 1 and scene 2).

Guidelines:
- Narration: Conversational, punchy, spoken-word style (~25-30 words per scene)
- Image prompts MUST include for high-quality AI generation:
  * Visual medium (e.g., "cinematic photography", "professional advertising shot", "editorial fashion photography")
  * Lighting description (e.g., "golden hour lighting", "soft studio lighting", "dramatic rim light")
  * Composition (e.g., "wide-angle establishing shot", "intimate close-up", "centered composition with negative space")
  * Concrete subjects, textures, and materials
  * Color palette and mood
- Overlay text: Ultra-short, impactful - think billboard
- Comp A and Comp B should feel distinctly different (e.g., warm vs cool, close-up vs wide, minimal vs dramatic)

Output exactly this format:

NARRATION SCENE 1: [voiceover text - the hook/problem/setup]
NARRATION SCENE 2: [voiceover text - the payoff/solution/CTA]

COMP A:
MOOD: [3-5 word mood description]
SCENE 1 IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
SCENE 1 OVERLAY: [1-3 words]
SCENE 2 IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
SCENE 2 OVERLAY: [1-3 words]

COMP B:
MOOD: [3-5 word mood description]
SCENE 1 IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
SCENE 1 OVERLAY: [1-3 words]
SCENE 2 IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
SCENE 2 OVERLAY: [1-3 words]`;

// Prompt for Wall of Text mode (1 image, scrolling text)
const WALL_OF_TEXT_PROMPT = `You are a creative director creating a "wall of text" video. This is a 20 second piece with scrolling text over a single atmospheric background image.

Video topic/theme: {subject}

Create TWO different creative directions (Comp A and Comp B). Both use the same script but have different visual approaches.

For each comp, provide:
1. MOOD - A short description of the visual feeling (3-5 words)
2. BACKGROUND IMAGE - A detailed image prompt optimized for AI image generation

Also provide the shared script (the full narration text that will scroll on screen).

Guidelines:
- Script: ~50-60 words MAXIMUM (this is critical - it must be speakable in 20 seconds), conversational, punchy
- Background image: MUST include specific details for high-quality AI generation:
  * Visual medium (e.g., "cinematic photography", "professional studio shot", "editorial photography")
  * Lighting description (e.g., "golden hour rim lighting", "soft diffused light", "dramatic side lighting")
  * Composition (e.g., "wide-angle view", "shallow depth of field", "centered composition")
  * Concrete textures and materials
  * Color palette
  * Keep it atmospheric and not too busy (text will overlay)
- Comp A and Comp B should feel distinctly different in style/mood

Output exactly this format:

SCRIPT: [full narration text, ~100-150 words]

COMP A:
MOOD: [3-5 word mood description]
BACKGROUND IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]

COMP B:
MOOD: [3-5 word mood description]
BACKGROUND IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]`;

// Prompt for Single Image mode
const IMAGE_PROMPT = `You are a creative director creating a single striking image for social media.

Image topic/theme: {subject}

Create TWO different creative directions (Comp A and Comp B).

For each comp, provide:
1. MOOD - A short description of the visual feeling (3-5 words)
2. IMAGE - A detailed image prompt optimized for AI image generation
3. HEADLINE - 3-7 impactful words to overlay on the image

Guidelines:
- Image prompts MUST include for high-quality AI generation:
  * Visual medium (e.g., "professional advertising photography", "cinematic still", "editorial portrait")
  * Lighting description (e.g., "soft diffused natural light", "dramatic studio lighting with rim light", "golden hour backlight")
  * Composition (e.g., "rule of thirds composition", "centered with symmetry", "dynamic diagonal lines")
  * Concrete subjects, textures, and materials
  * Color palette and mood
- Headline: Short, punchy, memorable
- Comp A and Comp B should feel distinctly different in style/approach

Output exactly this format:

COMP A:
MOOD: [3-5 word mood description]
IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
HEADLINE: [3-7 words]

COMP B:
MOOD: [3-5 word mood description]
IMAGE: [detailed AI image prompt with visual medium, lighting, composition, textures, colors]
HEADLINE: [3-7 words]`;

interface VideoComp {
  mood: string;
  scene1: { image: string; overlay: string };
  scene2: { image: string; overlay: string };
}

interface WallOfTextComp {
  mood: string;
  backgroundImage: string;
}

interface ImageComp {
  mood: string;
  image: string;
  headline: string;
}

interface VideoStoryboard {
  type: 'video';
  narration: { scene1: string; scene2: string };
  compA: VideoComp;
  compB: VideoComp;
}

interface WallOfTextStoryboard {
  type: 'wall-of-text';
  script: string;
  compA: WallOfTextComp;
  compB: WallOfTextComp;
}

interface ImageStoryboard {
  type: 'image';
  compA: ImageComp;
  compB: ImageComp;
}

type Storyboard = VideoStoryboard | WallOfTextStoryboard | ImageStoryboard;

function parseVideoResponse(response: string): VideoStoryboard {
  const narration1Match = response.match(/NARRATION SCENE 1:\s*([\s\S]+?)(?=NARRATION SCENE 2:|$)/i);
  const narration2Match = response.match(/NARRATION SCENE 2:\s*([\s\S]+?)(?=COMP A:|$)/i);

  const compAMatch = response.match(/COMP A:\s*([\s\S]+?)(?=COMP B:|$)/i);
  const compBMatch = response.match(/COMP B:\s*([\s\S]+?)$/i);

  function parseVideoComp(text: string): VideoComp {
    const moodMatch = text.match(/MOOD:\s*([^\n]+)/i);
    const scene1ImageMatch = text.match(/SCENE 1 IMAGE:\s*([\s\S]+?)(?=SCENE 1 OVERLAY:|$)/i);
    const scene1OverlayMatch = text.match(/SCENE 1 OVERLAY:\s*([^\n]+)/i);
    const scene2ImageMatch = text.match(/SCENE 2 IMAGE:\s*([\s\S]+?)(?=SCENE 2 OVERLAY:|$)/i);
    const scene2OverlayMatch = text.match(/SCENE 2 OVERLAY:\s*([^\n]+)/i);

    return {
      mood: moodMatch ? moodMatch[1].trim() : '',
      scene1: {
        image: scene1ImageMatch ? scene1ImageMatch[1].trim() : '',
        overlay: scene1OverlayMatch ? scene1OverlayMatch[1].trim() : '',
      },
      scene2: {
        image: scene2ImageMatch ? scene2ImageMatch[1].trim() : '',
        overlay: scene2OverlayMatch ? scene2OverlayMatch[1].trim() : '',
      },
    };
  }

  return {
    type: 'video',
    narration: {
      scene1: narration1Match ? narration1Match[1].trim() : '',
      scene2: narration2Match ? narration2Match[1].trim() : '',
    },
    compA: compAMatch ? parseVideoComp(compAMatch[1]) : { mood: '', scene1: { image: '', overlay: '' }, scene2: { image: '', overlay: '' } },
    compB: compBMatch ? parseVideoComp(compBMatch[1]) : { mood: '', scene1: { image: '', overlay: '' }, scene2: { image: '', overlay: '' } },
  };
}

function parseWallOfTextResponse(response: string): WallOfTextStoryboard {
  const scriptMatch = response.match(/SCRIPT:\s*([\s\S]+?)(?=COMP A:|$)/i);
  const compAMatch = response.match(/COMP A:\s*([\s\S]+?)(?=COMP B:|$)/i);
  const compBMatch = response.match(/COMP B:\s*([\s\S]+?)$/i);

  function parseWotComp(text: string): WallOfTextComp {
    const moodMatch = text.match(/MOOD:\s*([^\n]+)/i);
    const bgMatch = text.match(/BACKGROUND IMAGE:\s*([\s\S]+?)$/i);
    return {
      mood: moodMatch ? moodMatch[1].trim() : '',
      backgroundImage: bgMatch ? bgMatch[1].trim() : '',
    };
  }

  return {
    type: 'wall-of-text',
    script: scriptMatch ? scriptMatch[1].trim() : '',
    compA: compAMatch ? parseWotComp(compAMatch[1]) : { mood: '', backgroundImage: '' },
    compB: compBMatch ? parseWotComp(compBMatch[1]) : { mood: '', backgroundImage: '' },
  };
}

function parseImageResponse(response: string): ImageStoryboard {
  const compAMatch = response.match(/COMP A:\s*([\s\S]+?)(?=COMP B:|$)/i);
  const compBMatch = response.match(/COMP B:\s*([\s\S]+?)$/i);

  function parseImgComp(text: string): ImageComp {
    const moodMatch = text.match(/MOOD:\s*([^\n]+)/i);
    const imageMatch = text.match(/IMAGE:\s*([\s\S]+?)(?=HEADLINE:|$)/i);
    const headlineMatch = text.match(/HEADLINE:\s*([^\n]+)/i);
    return {
      mood: moodMatch ? moodMatch[1].trim() : '',
      image: imageMatch ? imageMatch[1].trim() : '',
      headline: headlineMatch ? headlineMatch[1].trim() : '',
    };
  }

  return {
    type: 'image',
    compA: compAMatch ? parseImgComp(compAMatch[1]) : { mood: '', image: '', headline: '' },
    compB: compBMatch ? parseImgComp(compBMatch[1]) : { mood: '', image: '', headline: '' },
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

    // Select prompt based on mode
    let promptTemplate: string;
    switch (mode) {
      case 'wall-of-text':
        promptTemplate = WALL_OF_TEXT_PROMPT;
        break;
      case 'image':
        promptTemplate = IMAGE_PROMPT;
        break;
      default:
        promptTemplate = VIDEO_PROMPT;
    }

    const client = new Anthropic({ apiKey });
    const prompt = promptTemplate.replace('{subject}', topic);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Parse based on mode
    let storyboard: Storyboard;
    switch (mode) {
      case 'wall-of-text':
        storyboard = parseWallOfTextResponse(responseText);
        break;
      case 'image':
        storyboard = parseImageResponse(responseText);
        break;
      default:
        storyboard = parseVideoResponse(responseText);
    }

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
