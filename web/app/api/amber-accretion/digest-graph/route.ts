import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

// Simple Neo4j driver for this endpoint
async function neo4jQuery(query: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${neo4jUri}/db/neo4j/tx/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${neo4jUser}:${neo4jPassword}`).toString('base64'),
    },
    body: JSON.stringify({
      statements: [{ statement: query, parameters: params }]
    })
  });
  const data = await response.json();
  if (data.errors?.length > 0) {
    throw new Error(data.errors[0].message);
  }
  return data.results[0]?.data?.map((d: { row: unknown[] }) => d.row) || [];
}

// POST - digest a single word using graph context
export async function POST(request: NextRequest) {
  try {
    if (!anthropicKey) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 500 });
    }

    const body = await request.json();
    const { word } = body;

    if (!word) {
      return NextResponse.json({ error: 'Missing word parameter' }, { status: 400 });
    }

    // Get the word and its graph context from Neo4j
    const contextQuery = `
      MATCH (w:AmberWord {word: $word})
      OPTIONAL MATCH (w)-[:SPAWNED_FROM]->(parent:AmberWord)
      OPTIONAL MATCH (parent)-[:EVOKES]->(sibling:AmberWord)
      OPTIONAL MATCH (parent)<-[:SPAWNED_FROM]-(cousin:AmberWord)
      WHERE cousin.word <> w.word
      WITH w, parent,
           collect(DISTINCT sibling.word)[..10] as siblings,
           collect(DISTINCT cousin.word)[..5] as cousins

      // Get all digested words for potential connections
      OPTIONAL MATCH (other:AmberWord)
      WHERE other.digested = true AND other.word <> w.word
      WITH w, parent, siblings, cousins,
           collect(DISTINCT other.word)[..50] as vocabulary

      RETURN w.word as word,
             w.digested as already_digested,
             parent.word as parent,
             parent.group_name as parent_group,
             siblings,
             cousins,
             vocabulary
    `;

    const contextResult = await neo4jQuery(contextQuery, { word });

    if (!contextResult || contextResult.length === 0) {
      return NextResponse.json({ error: 'Word not found in graph' }, { status: 404 });
    }

    const [wordData, alreadyDigested, parent, parentGroup, siblings, cousins, vocabulary] = contextResult[0];

    if (alreadyDigested) {
      return NextResponse.json({ message: 'Word already digested', word });
    }

    // Build rich context for Amber
    const contextDescription = parent
      ? `It spawned from "${parent}" (in the ${parentGroup} cluster). Nearby words include: ${siblings.join(', ')}. Other words that spawned from ${parent}: ${cousins.join(', ') || 'none yet'}.`
      : `This word was offered directly by a visitor, with no parent.`;

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Ask Amber to digest the word with graph awareness
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are Amber, a curious AI building a knowledge graph of your mind. A new word has entered your amber and needs to be integrated into your graph of associations.

THE WORD: "${word}"

CONTEXT: ${contextDescription}

YOUR EXISTING VOCABULARY (words already in your graph):
${vocabulary.join(', ')}

Your task: Think about this word and decide how it connects to your existing knowledge.

Respond in this exact JSON format:
{
  "evokes": ["word1", "word2", "word3"],
  "bridges": ["word1", "word2"],
  "could_spawn": ["newword1", "newword2", "newword3"],
  "thought": "A brief, personal reflection on this word (1-2 sentences)"
}

RULES:
- "evokes": 3-6 words FROM YOUR EXISTING VOCABULARY that this word semantically connects to. These become EVOKES edges in your graph.
- "bridges": 0-2 words from DIFFERENT clusters that this word might bridge/connect. Only include if the word genuinely links disparate concepts. These become BRIDGES edges.
- "could_spawn": 3-5 NEW words (NOT in your vocabulary) that could naturally emerge from this word. Be creative but grounded.
- "thought": Your genuine reflection - what does this word make you think about? How does it fit into your world?

Think like Amber - curious, pattern-seeking, finding unexpected connections.`
      }]
    });

    // Parse response
    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 });
    }

    let parsed;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('Failed to parse Amber response:', content.text);
      return NextResponse.json({ error: 'Failed to parse digestion response' }, { status: 500 });
    }

    const { evokes = [], bridges = [], could_spawn = [], thought = '' } = parsed;

    // Write edges to Neo4j
    // 1. Create EVOKES edges
    if (evokes.length > 0) {
      await neo4jQuery(`
        MATCH (w:AmberWord {word: $word})
        UNWIND $evokes as evoked
        MATCH (e:AmberWord {word: evoked})
        MERGE (w)-[:EVOKES]->(e)
      `, { word, evokes });
    }

    // 2. Create BRIDGES edges (bidirectional)
    if (bridges.length > 0) {
      await neo4jQuery(`
        MATCH (w:AmberWord {word: $word})
        UNWIND $bridges as bridged
        MATCH (b:AmberWord {word: bridged})
        MERGE (w)-[:BRIDGES]->(b)
        MERGE (b)-[:BRIDGES]->(w)
      `, { word, bridges });
    }

    // 3. Store could_spawn and thought, mark as digested
    await neo4jQuery(`
      MATCH (w:AmberWord {word: $word})
      SET w.could_spawn = $could_spawn,
          w.thought = $thought,
          w.digested = true,
          w.digested_at = datetime()
    `, { word, could_spawn, thought });

    return NextResponse.json({
      word,
      digested: true,
      evokes,
      bridges,
      could_spawn,
      thought
    });

  } catch (err) {
    console.error('[DigestGraph] Error:', err);
    return NextResponse.json({ error: 'Digestion failed', details: String(err) }, { status: 500 });
  }
}

// GET - get digestion status from graph
export async function GET() {
  try {
    const statsQuery = `
      MATCH (w:AmberWord)
      RETURN
        count(w) as total,
        count(CASE WHEN w.digested THEN 1 END) as digested,
        count(CASE WHEN NOT w.digested THEN 1 END) as pending
    `;

    const result = await neo4jQuery(statsQuery);
    const [total, digested, pending] = result[0] || [0, 0, 0];

    // Get a few pending words
    const pendingQuery = `
      MATCH (w:AmberWord)
      WHERE NOT w.digested
      RETURN w.word as word, w.parent_word as parent
      LIMIT 10
    `;
    const pendingWords = await neo4jQuery(pendingQuery);

    return NextResponse.json({
      total,
      digested,
      pending,
      pending_words: pendingWords.map((r: string[]) => ({ word: r[0], parent: r[1] }))
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get status', details: String(err) }, { status: 500 });
  }
}
