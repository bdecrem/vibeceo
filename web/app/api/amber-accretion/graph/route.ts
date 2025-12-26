import { NextRequest, NextResponse } from 'next/server';

const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

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

// GET - get all words with their connections for visualization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');

    if (word) {
      // Get specific word's connections
      const query = `
        MATCH (w:AmberWord {word: $word})
        OPTIONAL MATCH (w)-[:SPAWNED_FROM]->(parent:AmberWord)
        OPTIONAL MATCH (w)-[:EVOKES]->(evoked:AmberWord)
        OPTIONAL MATCH (w)-[:BRIDGES]->(bridged:AmberWord)
        OPTIONAL MATCH (w)<-[:SPAWNED_FROM]-(child:AmberWord)
        RETURN w.word as word,
               w.is_root as is_root,
               w.digested as digested,
               w.thought as thought,
               w.could_spawn as could_spawn,
               w.group_name as group_name,
               parent.word as parent,
               collect(DISTINCT evoked.word) as evokes,
               collect(DISTINCT bridged.word) as bridges,
               collect(DISTINCT child.word) as children
      `;
      const result = await neo4jQuery(query, { word });

      if (result.length === 0) {
        return NextResponse.json({ error: 'Word not found' }, { status: 404 });
      }

      const [w, is_root, digested, thought, could_spawn, group_name, parent, evokes, bridges, children] = result[0];
      return NextResponse.json({
        word: w,
        is_root,
        digested,
        thought,
        could_spawn: could_spawn || [],
        group_name,
        parent,
        evokes: evokes.filter(Boolean),
        bridges: bridges.filter(Boolean),
        children: children.filter(Boolean)
      });
    }

    // Get all words for visualization (with positions from Supabase accretion table)
    const query = `
      MATCH (w:AmberWord)
      OPTIONAL MATCH (w)-[:SPAWNED_FROM]->(parent:AmberWord)
      OPTIONAL MATCH (w)-[:EVOKES]->(evoked:AmberWord)
      RETURN w.word as word,
             w.is_root as is_root,
             w.digested as digested,
             w.group_name as group_name,
             w.thought as thought,
             parent.word as parent,
             collect(DISTINCT evoked.word) as evokes
      ORDER BY w.created_at
    `;

    const result = await neo4jQuery(query);

    const words = result.map((row: unknown[]) => ({
      word: row[0],
      is_root: row[1],
      digested: row[2],
      group_name: row[3],
      thought: row[4],
      parent: row[5],
      evokes: (row[6] as string[]).filter(Boolean)
    }));

    return NextResponse.json({ words, total: words.length });

  } catch (err) {
    console.error('[Graph] Error:', err);
    return NextResponse.json({ error: 'Failed to query graph', details: String(err) }, { status: 500 });
  }
}

// POST - add a new word to the graph (called when word gets caught)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, parent_word } = body;

    if (!word) {
      return NextResponse.json({ error: 'Missing word' }, { status: 400 });
    }

    // Check if word already exists
    const existsQuery = `MATCH (w:AmberWord {word: $word}) RETURN w.word`;
    const exists = await neo4jQuery(existsQuery, { word });

    if (exists.length > 0) {
      return NextResponse.json({ error: 'Word already exists', code: 'DUPLICATE' }, { status: 409 });
    }

    // Create the word node
    const createQuery = `
      CREATE (w:AmberWord {
        word: $word,
        is_root: false,
        digested: false,
        parent_word: $parent_word,
        created_at: datetime()
      })
      WITH w
      // Create SPAWNED_FROM edge if parent exists
      OPTIONAL MATCH (parent:AmberWord {word: $parent_word})
      FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
        MERGE (w)-[:SPAWNED_FROM]->(parent)
      )
      RETURN w.word as word
    `;

    await neo4jQuery(createQuery, { word, parent_word: parent_word || null });

    return NextResponse.json({ word, created: true });

  } catch (err) {
    console.error('[Graph] Error:', err);
    return NextResponse.json({ error: 'Failed to add word', details: String(err) }, { status: 500 });
  }
}
