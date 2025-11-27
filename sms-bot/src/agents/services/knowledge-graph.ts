/**
 * Knowledge Graph Service
 * Neo4j integration for storing and querying knowledge graphs
 */

import neo4j, { Driver, Session, Integer } from 'neo4j-driver';

let driver: Driver | null = null;

interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

/**
 * Initialize Neo4j driver
 */
export function initNeo4jDriver(): Driver {
  if (driver) {
    return driver;
  }

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE || 'neo4j';

  if (!uri || !username || !password) {
    throw new Error(
      '❌ Neo4j credentials not found in environment. ' +
      'Please configure NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in .env.local'
    );
  }

  console.log(`🔌 Connecting to Neo4j at ${uri}...`);

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  });

  console.log('✅ Neo4j driver initialized successfully');

  return driver;
}

/**
 * Get Neo4j session
 */
export function getSession(): Session {
  if (!driver) {
    driver = initNeo4jDriver();
  }

  const database = process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database });
}

/**
 * Close Neo4j driver
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('✅ Neo4j driver closed');
  }
}

/**
 * Entity node structure
 */
export interface Entity {
  id?: string;
  name: string;
  type: string; // person, organization, location, concept, etc.
  properties?: Record<string, any>;
  source?: string; // Where this entity was extracted from
  confidence?: number;
}

/**
 * Relationship structure
 */
export interface Relationship {
  from: string; // Entity name or ID
  to: string; // Entity name or ID
  type: string; // WORKS_FOR, LOCATED_IN, RELATED_TO, etc.
  properties?: Record<string, any>;
  confidence?: number;
}

/**
 * Create or update an entity in the knowledge graph
 */
export async function createEntity(entity: Entity): Promise<void> {
  const session = getSession();

  try {
    const query = `
      MERGE (e:Entity {name: $name, type: $type})
      SET e.properties = $properties,
          e.source = $source,
          e.confidence = $confidence,
          e.updatedAt = datetime()
      RETURN e
    `;

    await session.run(query, {
      name: entity.name,
      type: entity.type,
      properties: entity.properties || {},
      source: entity.source || 'unknown',
      confidence: entity.confidence || 0.5,
    });

    console.log(`   ✅ Created entity: ${entity.name} (${entity.type})`);
  } finally {
    await session.close();
  }
}

/**
 * Create a relationship between two entities
 */
export async function createRelationship(rel: Relationship): Promise<void> {
  const session = getSession();

  try {
    // First, ensure both entities exist
    const ensureQuery = `
      MERGE (from:Entity {name: $fromName})
      MERGE (to:Entity {name: $toName})
    `;

    await session.run(ensureQuery, {
      fromName: rel.from,
      toName: rel.to,
    });

    // Create the relationship
    const relQuery = `
      MATCH (from:Entity {name: $fromName})
      MATCH (to:Entity {name: $toName})
      MERGE (from)-[r:\`${rel.type}\`]->(to)
      SET r.properties = $properties,
          r.confidence = $confidence,
          r.updatedAt = datetime()
      RETURN r
    `;

    await session.run(relQuery, {
      fromName: rel.from,
      toName: rel.to,
      properties: rel.properties || {},
      confidence: rel.confidence || 0.5,
    });

    console.log(`   ✅ Created relationship: ${rel.from} -[${rel.type}]-> ${rel.to}`);
  } finally {
    await session.close();
  }
}

/**
 * Query entities by type
 */
export async function queryEntitiesByType(type: string, limit: number = 100): Promise<Entity[]> {
  const session = getSession();

  try {
    const query = `
      MATCH (e:Entity {type: $type})
      RETURN e
      LIMIT $limit
    `;

    const result = await session.run(query, { type, limit: Integer.fromNumber(limit) });

    return result.records.map((record) => {
      const node = record.get('e');
      return {
        id: node.identity.toString(),
        name: node.properties.name,
        type: node.properties.type,
        properties: node.properties.properties || {},
        source: node.properties.source,
        confidence: node.properties.confidence,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find related entities
 */
export async function findRelatedEntities(
  entityName: string,
  relationshipType?: string,
  depth: number = 1
): Promise<{ entity: Entity; relationship: string; relatedEntity: Entity }[]> {
  const session = getSession();

  try {
    const relTypeFilter = relationshipType ? `:\`${relationshipType}\`` : '';

    const query = `
      MATCH (e:Entity {name: $entityName})-[r${relTypeFilter}*1..${depth}]-(related:Entity)
      RETURN DISTINCT e, type(r[0]) as relType, related
      LIMIT 100
    `;

    const result = await session.run(query, { entityName });

    return result.records.map((record) => {
      const entityNode = record.get('e');
      const relatedNode = record.get('related');
      const relType = record.get('relType');

      return {
        entity: {
          name: entityNode.properties.name,
          type: entityNode.properties.type,
          properties: entityNode.properties.properties || {},
        },
        relationship: relType,
        relatedEntity: {
          name: relatedNode.properties.name,
          type: relatedNode.properties.type,
          properties: relatedNode.properties.properties || {},
        },
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Execute custom Cypher query
 */
export async function executeCypherQuery(query: string, params: Record<string, any> = {}): Promise<any[]> {
  const session = getSession();

  try {
    console.log(`   Executing Cypher query...`);
    const result = await session.run(query, params);

    return result.records.map((record) => {
      const obj: Record<string, any> = {};
      record.keys.forEach((key: string) => {
        obj[key] = record.get(key);
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

/**
 * Clear all entities and relationships (USE WITH CAUTION)
 */
export async function clearGraph(): Promise<void> {
  const session = getSession();

  try {
    console.log('⚠️  Clearing entire knowledge graph...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Knowledge graph cleared');
  } finally {
    await session.close();
  }
}

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  entityCount: number;
  relationshipCount: number;
  entityTypes: { type: string; count: number }[];
}> {
  const session = getSession();

  try {
    // Count entities
    const entityResult = await session.run('MATCH (n:Entity) RETURN count(n) as count');
    const entityCount = entityResult.records[0].get('count').toNumber();

    // Count relationships
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const relationshipCount = relResult.records[0].get('count').toNumber();

    // Count by type
    const typeResult = await session.run(`
      MATCH (n:Entity)
      RETURN n.type as type, count(n) as count
      ORDER BY count DESC
    `);

    const entityTypes = typeResult.records.map((record) => ({
      type: record.get('type') || 'unknown',
      count: record.get('count').toNumber(),
    }));

    return {
      entityCount,
      relationshipCount,
      entityTypes,
    };
  } finally {
    await session.close();
  }
}

/**
 * Health check for Neo4j connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const session = getSession();
    await session.run('RETURN 1');
    await session.close();
    return true;
  } catch (error) {
    console.error('❌ Neo4j health check failed:', error);
    return false;
  }
}
