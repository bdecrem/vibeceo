import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// POST - digest undigested words (Amber free-associates)
export async function POST(request: NextRequest) {
  try {
    if (!anthropicKey) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 500 });
    }

    const supabase = getSupabase();
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Get undigested words (limit to 10 per run to control costs)
    const { data: undigested, error: fetchError } = await supabase
      .from('amber_vocabulary')
      .select('word, parent_word')
      .eq('is_digested', false)
      .limit(10);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!undigested || undigested.length === 0) {
      return NextResponse.json({ message: 'No words to digest', digested: 0 });
    }

    // Get existing vocabulary for context
    const { data: existing } = await supabase
      .from('amber_vocabulary')
      .select('word')
      .eq('is_digested', true);

    const existingWords = existing?.map(e => e.word) || [];

    const results = [];

    for (const entry of undigested) {
      const { word, parent_word } = entry;

      // Amber free-associates
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are Amber, a curious AI who notices patterns and makes unexpected connections. You have a growing vocabulary stored in an "amber" - a visual representation of your mind.

The word "${word}" just entered your amber${parent_word ? ` (it emerged from "${parent_word}")` : ''}.

Your existing vocabulary includes: ${existingWords.slice(0, 50).join(', ')}${existingWords.length > 50 ? '...' : ''}

Think about this word. What does it connect to in your mind? What new words could emerge from it?

Respond in this exact JSON format:
{
  "associations": ["word1", "word2", "word3"],
  "spawn_candidates": ["newword1", "newword2", "newword3", "newword4", "newword5"],
  "thought": "A brief (1 sentence) thought about this word"
}

Rules:
- associations: 3-6 words from your existing vocabulary that this word connects to
- spawn_candidates: 3-5 NEW words (not in your vocabulary) that could emerge from this word
- Keep spawn_candidates interesting but grounded - words Amber would actually think of
- The "thought" is optional, just for flavor`
        }]
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') continue;

      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content.text;
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);
        const associations = parsed.associations || [];
        const spawn_candidates = parsed.spawn_candidates || [];

        // Update the vocabulary entry
        const { error: updateError } = await supabase
          .from('amber_vocabulary')
          .update({
            associations,
            spawn_candidates,
            is_digested: true,
            digested_at: new Date().toISOString()
          })
          .eq('word', word);

        if (!updateError) {
          results.push({
            word,
            associations,
            spawn_candidates,
            thought: parsed.thought
          });
        }
      } catch (parseError) {
        console.error(`Failed to parse response for "${word}":`, parseError);
      }
    }

    return NextResponse.json({
      message: `Digested ${results.length} words`,
      digested: results.length,
      results
    });

  } catch (err) {
    console.error('[Digest] Error:', err);
    return NextResponse.json({ error: 'Digestion failed' }, { status: 500 });
  }
}

// GET - check digestion status
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: stats } = await supabase
      .from('amber_vocabulary')
      .select('is_digested');

    const total = stats?.length || 0;
    const digested = stats?.filter(s => s.is_digested).length || 0;
    const pending = total - digested;

    return NextResponse.json({
      total,
      digested,
      pending
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
