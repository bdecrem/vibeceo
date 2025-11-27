/**
 * Knowledge Graph Entity Extraction Pipeline
 * Extracts entities and relationships from items and stores them in Neo4j
 */

import OpenAI from 'openai';
import type { NormalizedItem } from '@vibeceo/shared-types';
import {
  createEntity,
  createRelationship,
  type Entity,
  type Relationship,
} from '../services/knowledge-graph.js';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        '❌ OPENAI_API_KEY not found in environment. ' +
        'Please configure your OpenAI API key in the backend .env file. ' +
        'Get your key at: https://platform.openai.com/api-keys'
      );
    }
    openaiClient = new OpenAI({ apiKey });
    console.log('✅ OpenAI client initialized for knowledge graph extraction');
  }
  return openaiClient;
}

export interface KGExtractConfig {
  model?: string;
  entityTypes?: string[]; // Types of entities to extract
  extractRelationships?: boolean;
  minConfidence?: number; // Minimum confidence threshold (0-1)
}

interface ExtractedKnowledge {
  entities: Entity[];
  relationships: Relationship[];
}

/**
 * Extract entities and relationships from items and store in knowledge graph
 */
export async function extractToKnowledgeGraph(
  items: NormalizedItem[],
  config: KGExtractConfig = {}
): Promise<{ entitiesCreated: number; relationshipsCreated: number }> {
  if (!items || items.length === 0) {
    console.log('   No items to process for knowledge graph');
    return { entitiesCreated: 0, relationshipsCreated: 0 };
  }

  const {
    model = 'gpt-4o-mini',
    entityTypes = ['person', 'organization', 'location', 'concept', 'technology'],
    extractRelationships = true,
    minConfidence = 0.6,
  } = config;

  console.log(`🧠 Extracting knowledge from ${items.length} items to Neo4j...`);
  console.log(`   Entity types: ${entityTypes.join(', ')}`);
  console.log(`   Extract relationships: ${extractRelationships}`);

  let totalEntities = 0;
  let totalRelationships = 0;

  try {
    const openai = getOpenAIClient();

    // Process items in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}...`);

      for (const item of batch) {
        try {
          const knowledge = await extractKnowledgeFromItem(
            openai,
            item,
            model,
            entityTypes,
            extractRelationships,
            minConfidence
          );

          // Store entities in Neo4j
          for (const entity of knowledge.entities) {
            await createEntity(entity);
            totalEntities++;
          }

          // Store relationships in Neo4j
          if (extractRelationships) {
            for (const rel of knowledge.relationships) {
              await createRelationship(rel);
              totalRelationships++;
            }
          }

          console.log(`   ✅ Processed: ${item.title?.substring(0, 50)}... (${knowledge.entities.length} entities, ${knowledge.relationships.length} rels)`);
        } catch (error: any) {
          console.error(`   ❌ Failed to process item: ${item.title}`, error.message);
          // Continue with next item
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Knowledge graph extraction complete: ${totalEntities} entities, ${totalRelationships} relationships`);

    return {
      entitiesCreated: totalEntities,
      relationshipsCreated: totalRelationships,
    };
  } catch (error: any) {
    console.error(`❌ Knowledge graph extraction failed: ${error.message}`);

    if (error.message.includes('OPENAI_API_KEY') || error.message.includes('NEO4J')) {
      throw error; // Re-throw config errors
    }

    if (error.status === 401) {
      throw new Error('❌ OpenAI API authentication failed. Please check your API key.');
    }

    if (error.status === 429) {
      throw new Error('❌ OpenAI API rate limit exceeded. Please try again later or upgrade your plan.');
    }

    throw new Error(`❌ Knowledge graph extraction failed: ${error.message}`);
  }
}

/**
 * Extract knowledge from a single item using AI
 */
async function extractKnowledgeFromItem(
  openai: OpenAI,
  item: NormalizedItem,
  model: string,
  entityTypes: string[],
  extractRelationships: boolean,
  minConfidence: number
): Promise<ExtractedKnowledge> {
  const systemPrompt = `You are an expert knowledge graph extractor. Extract entities and relationships from the provided content.

Entity types to extract: ${entityTypes.join(', ')}

For each entity, provide:
- name: The entity name (canonical form)
- type: One of the specified entity types
- confidence: Your confidence in this extraction (0-1)

${extractRelationships ? `For relationships, identify connections between entities with:
- from: Source entity name
- to: Target entity name
- type: Relationship type (e.g., WORKS_FOR, LOCATED_IN, FOUNDED, CEO_OF, PARTNER_WITH)
- confidence: Your confidence (0-1)` : ''}

Return a JSON object with this structure:
{
  "entities": [{"name": "...", "type": "...", "confidence": 0.9, "properties": {}}],
  "relationships": [{"from": "...", "to": "...", "type": "...", "confidence": 0.8}]
}

Only include entities and relationships with confidence >= ${minConfidence}.`;

  const userPrompt = `Title: ${item.title}
Summary: ${item.summary || 'N/A'}
URL: ${item.url || 'N/A'}

Extract entities and relationships from this content.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // Low temperature for consistent extraction
    max_tokens: 1500,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{"entities":[],"relationships":[]}');

  // Add source information to entities
  const entities: Entity[] = (result.entities || []).map((e: any) => ({
    name: e.name,
    type: e.type,
    properties: e.properties || {},
    source: item.url || item.title,
    confidence: e.confidence || 0.5,
  }));

  // Filter by confidence
  const filteredEntities = entities.filter((e) => (e.confidence || 0) >= minConfidence);

  const relationships: Relationship[] = extractRelationships
    ? (result.relationships || [])
        .filter((r: any) => (r.confidence || 0) >= minConfidence)
        .map((r: any) => ({
          from: r.from,
          to: r.to,
          type: r.type,
          properties: r.properties || {},
          confidence: r.confidence || 0.5,
        }))
    : [];

  return {
    entities: filteredEntities,
    relationships,
  };
}
