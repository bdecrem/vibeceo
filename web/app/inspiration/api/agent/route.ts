import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface AgentRequest {
  topic: string;
  mode: 'video' | 'wall-of-text' | 'image';
  feedback: string;
  currentComps: {
    compA: { mood: string; imageDescription: string };
    compB: { mood: string; imageDescription: string };
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const AGENT_SYSTEM_PROMPT = `You are a creative director helping refine visual directions for short video ads.

The user has seen two initial creative directions (Comp A and Comp B) and has feedback. Your job is to:
1. Understand their feedback
2. Generate TWO new creative directions (Comp C and Comp D) that address their concerns
3. Keep what they liked, change what they didn't

Always output in this exact format:

REASONING: [1-2 sentences explaining how you interpreted their feedback and what you're changing]

COMP C:
MOOD: [3-5 word mood description]
IMAGE: [vivid visual description for AI image generator]

COMP D:
MOOD: [3-5 word mood description]
IMAGE: [vivid visual description for AI image generator]

Guidelines:
- Be specific and visual in image descriptions
- Make C and D distinctly different from each other
- Address ALL the user's feedback points
- Keep descriptions concrete, not abstract`;

export async function POST(request: NextRequest) {
  try {
    const { topic, mode, feedback, currentComps, history = [] } = await request.json() as AgentRequest;

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Build context message
    const contextMessage = `Topic: "${topic}"
Mode: ${mode}

Current creative directions:

COMP A:
Mood: ${currentComps.compA.mood}
Image: ${currentComps.compA.imageDescription}

COMP B:
Mood: ${currentComps.compB.mood}
Image: ${currentComps.compB.imageDescription}

User feedback: "${feedback}"

Based on this feedback, generate two new creative directions (C and D) that better match what the user is looking for.`;

    // Build messages array with history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: contextMessage },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: AGENT_SYSTEM_PROMPT,
      messages,
    });

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Parse the response
    const reasoningMatch = responseText.match(/REASONING:\s*([\s\S]+?)(?=COMP C:|$)/i);
    const compCMatch = responseText.match(/COMP C:\s*([\s\S]+?)(?=COMP D:|$)/i);
    const compDMatch = responseText.match(/COMP D:\s*([\s\S]+?)$/i);

    function parseComp(text: string): { mood: string; imageDescription: string } {
      const moodMatch = text.match(/MOOD:\s*([^\n]+)/i);
      const imageMatch = text.match(/IMAGE:\s*([\s\S]+?)$/i);
      return {
        mood: moodMatch ? moodMatch[1].trim() : '',
        imageDescription: imageMatch ? imageMatch[1].trim() : '',
      };
    }

    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';
    const compC = compCMatch ? parseComp(compCMatch[1]) : { mood: '', imageDescription: '' };
    const compD = compDMatch ? parseComp(compDMatch[1]) : { mood: '', imageDescription: '' };

    return NextResponse.json({
      reasoning,
      compC,
      compD,
      raw: responseText,
    });

  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
