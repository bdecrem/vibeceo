/**
 * Knowledge Graph Query Pipeline
 * Query the knowledge graph to enrich items or answer questions
 */

import type { NormalizedItem } from '@vibeceo/shared-types';
import {
  queryEntitiesByType,
  findRelatedEntities,
  executeCypherQuery,
  getGraphStats,
} from '../services/knowledge-graph.js';

export interface KGQueryConfig {
  queryType: 'entity_lookup' | 'relationship_search' | 'custom_cypher' | 'stats';
  entityType?: string; // For entity_lookup
  entityName?: string; // For relationship_search
  relationshipType?: string; // For relationship_search
  cypherQuery?: string; // For custom_cypher
  enrichItems?: boolean; // Add graph data to items
}

/**
 * Query the knowledge graph
 */
export async function queryKnowledgeGraph(
  items: NormalizedItem[],
  config: KGQueryConfig
): Promise<NormalizedItem[]> {
  console.log(`🔍 Querying knowledge graph: ${config.queryType}...`);

  try {
    switch (config.queryType) {
      case 'entity_lookup':
        return await enrichWithEntities(items, config);

      case 'relationship_search':
        return await enrichWithRelationships(items, config);

      case 'custom_cypher':
        return await enrichWithCustomQuery(items, config);

      case 'stats':
        return await enrichWithStats(items);

      default:
        console.log('   Unknown query type, returning items unchanged');
        return items;
    }
  } catch (error: any) {
    console.error(`❌ Knowledge graph query failed: ${error.message}`);

    if (error.message.includes('NEO4J')) {
      throw error; // Re-throw Neo4j connection errors
    }

    // Return original items on other errors
    return items;
  }
}

/**
 * Enrich items with entity data from graph
 */
async function enrichWithEntities(
  items: NormalizedItem[],
  config: KGQueryConfig
): Promise<NormalizedItem[]> {
  if (!config.entityType) {
    console.log('   No entity type specified, skipping enrichment');
    return items;
  }

  console.log(`   Looking up entities of type: ${config.entityType}...`);

  const entities = await queryEntitiesByType(config.entityType, 1000);

  console.log(`   Found ${entities.length} entities of type ${config.entityType}`);

  // Enrich items with matching entities
  return items.map((item) => {
    const matchingEntities = entities.filter(
      (entity) =>
        item.title?.toLowerCase().includes(entity.name.toLowerCase()) ||
        item.summary?.toLowerCase().includes(entity.name.toLowerCase())
    );

    if (matchingEntities.length > 0) {
      return {
        ...item,
        raw: {
          ...item.raw,
          kgEntities: matchingEntities,
        },
      };
    }

    return item;
  });
}

/**
 * Enrich items with relationship data from graph
 */
async function enrichWithRelationships(
  items: NormalizedItem[],
  config: KGQueryConfig
): Promise<NormalizedItem[]> {
  if (!config.entityName) {
    console.log('   No entity name specified, skipping relationship enrichment');
    return items;
  }

  console.log(`   Finding relationships for entity: ${config.entityName}...`);

  const related = await findRelatedEntities(
    config.entityName,
    config.relationshipType,
    2 // depth
  );

  console.log(`   Found ${related.length} related entities`);

  // Add relationship context to all items
  if (related.length > 0) {
    return items.map((item) => ({
      ...item,
      raw: {
        ...item.raw,
        kgRelationships: related,
        kgContext: `Related to ${config.entityName}: ${related.map((r) => `${r.relatedEntity.name} (${r.relationship})`).join(', ')}`,
      },
    }));
  }

  return items;
}

/**
 * Enrich items with custom Cypher query results
 */
async function enrichWithCustomQuery(
  items: NormalizedItem[],
  config: KGQueryConfig
): Promise<NormalizedItem[]> {
  if (!config.cypherQuery) {
    console.log('   No Cypher query specified');
    return items;
  }

  console.log(`   Executing custom Cypher query...`);

  const results = await executeCypherQuery(config.cypherQuery);

  console.log(`   Query returned ${results.length} results`);

  // Add query results to all items
  return items.map((item) => ({
    ...item,
    raw: {
      ...item.raw,
      kgQueryResults: results,
    },
  }));
}

/**
 * Enrich items with graph statistics
 */
async function enrichWithStats(items: NormalizedItem[]): Promise<NormalizedItem[]> {
  console.log(`   Getting knowledge graph statistics...`);

  const stats = await getGraphStats();

  console.log(`   Graph stats: ${stats.entityCount} entities, ${stats.relationshipCount} relationships`);

  // Add stats to all items
  return items.map((item) => ({
    ...item,
    raw: {
      ...item.raw,
      kgStats: stats,
    },
  }));
}

/**
 * Generate a summary of the knowledge graph
 */
export async function generateKGSummary(): Promise<string> {
  const stats = await getGraphStats();

  let summary = `📊 Knowledge Graph Summary\n\n`;
  summary += `Total Entities: ${stats.entityCount}\n`;
  summary += `Total Relationships: ${stats.relationshipCount}\n\n`;

  if (stats.entityTypes.length > 0) {
    summary += `Entity Breakdown:\n`;
    stats.entityTypes.forEach((et) => {
      summary += `  • ${et.type}: ${et.count}\n`;
    });
  }

  return summary;
}
