# Knowledge Graph Integration with Neo4j

Complete guide to using Neo4j knowledge graph features in Vibeceo.

---

## Overview

The Knowledge Graph feature allows you to:
- **Extract entities and relationships** from content using AI
- **Store them in Neo4j** graph database for persistent knowledge
- **Query the graph** to enrich items with contextual information
- **Build a growing knowledge base** over time

---

## Table of Contents

1. [Setup](#setup)
2. [Architecture](#architecture)
3. [Workflow Nodes](#workflow-nodes)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Setup

### 1. Neo4j Database

You already have a Neo4j Aura instance configured:

```
URI: neo4j+s://7d35811b.databases.neo4j.io
Username: neo4j
Password: 3LBx6Y6rjJvqkH13SkgaLKaMalamMEM7j1DZ8BQYC_0
Database: neo4j
```

### 2. Environment Variables

Already configured in `/sms-bot/.env.local`:

```bash
NEO4J_URI=neo4j+s://7d35811b.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=3LBx6Y6rjJvqkH13SkgaLKaMalamMEM7j1DZ8BQYC_0
NEO4J_DATABASE=neo4j
```

### 3. Required Dependencies

```bash
cd /vibeceo/sms-bot
npm install neo4j-driver  # ✅ Already installed
```

### 4. Verify Connection

Test your Neo4j connection:

```typescript
import { healthCheck } from './src/agents/services/knowledge-graph';

const isHealthy = await healthCheck();
console.log('Neo4j connected:', isHealthy);
```

---

## Architecture

### Components

1. **Knowledge Graph Service** (`services/knowledge-graph.ts`)
   - Core Neo4j operations (CRUD)
   - Connection management
   - Query execution

2. **KG Extract Pipeline** (`pipeline/knowledge-graph-extract.ts`)
   - AI-powered entity extraction
   - Relationship discovery
   - Graph population

3. **KG Query Pipeline** (`pipeline/knowledge-graph-query.ts`)
   - Graph querying
   - Item enrichment
   - Statistics

4. **Workflow Nodes** (Frontend)
   - 🧠 Extract to Knowledge Graph
   - 🔍 Query Knowledge Graph

### Data Model

```
Entity {
  name: string          // Canonical entity name
  type: string          // person, organization, location, concept, technology
  properties: object    // Additional metadata
  source: string        // Where it was extracted from
  confidence: number    // Extraction confidence (0-1)
  updatedAt: datetime   // Last updated
}

Relationship {
  from: Entity          // Source entity
  to: Entity            // Target entity
  type: string          // WORKS_FOR, FOUNDED, LOCATED_IN, etc.
  properties: object    // Additional metadata
  confidence: number    // Relationship confidence (0-1)
  updatedAt: datetime   // Last updated
}
```

---

## Workflow Nodes

### 1. Extract to Knowledge Graph (🧠 `kg_extract`)

**Purpose:** Extracts entities and relationships from items, stores them in Neo4j

**Configuration:**
- `entityTypes`: Array of entity types to extract
  - Default: `['person', 'organization', 'location', 'concept']`
  - Examples: `person`, `organization`, `location`, `technology`, `product`, `event`
- `extractRelationships`: Boolean - whether to extract relationships
  - Default: `true`
- `minConfidence`: Minimum confidence threshold (0-1)
  - Default: `0.6`
- `model`: AI model to use
  - Default: `gpt-4o-mini`

**Example:**
```json
{
  "entityTypes": ["person", "organization", "technology"],
  "extractRelationships": true,
  "minConfidence": 0.7,
  "model": "gpt-4o-mini"
}
```

**What it does:**
1. For each item, sends content to OpenAI
2. AI identifies entities and relationships
3. Filters by confidence threshold
4. Creates/updates entities in Neo4j
5. Creates relationships between entities

**Output:**
- Items pass through unchanged
- Entities and relationships stored in Neo4j
- Console logs show extraction progress

---

### 2. Query Knowledge Graph (🔍 `kg_query`)

**Purpose:** Queries Neo4j to enrich items with graph context

**Configuration:**
- `queryType`: Type of query to perform
  - `entity_lookup`: Find all entities of a specific type
  - `relationship_search`: Find entities related to a specific entity
  - `custom_cypher`: Execute custom Cypher query
  - `stats`: Get graph statistics
- `enrichItems`: Boolean - whether to add graph data to items
  - Default: `true`

**Query Type: Entity Lookup**
```json
{
  "queryType": "entity_lookup",
  "entityType": "organization",
  "enrichItems": true
}
```

**Query Type: Relationship Search**
```json
{
  "queryType": "relationship_search",
  "entityName": "OpenAI",
  "relationshipType": "WORKS_FOR",  // Optional
  "enrichItems": true
}
```

**Query Type: Custom Cypher**
```json
{
  "queryType": "custom_cypher",
  "cypherQuery": "MATCH (p:Entity {type: 'person'})-[r:WORKS_FOR]->(o:Entity {type: 'organization'}) RETURN p, r, o LIMIT 10",
  "enrichItems": true
}
```

**Query Type: Graph Statistics**
```json
{
  "queryType": "stats",
  "enrichItems": true
}
```

**What it adds to items:**
- `item.raw.kgEntities`: Matching entities from graph
- `item.raw.kgRelationships`: Related entities and relationships
- `item.raw.kgContext`: Human-readable context string
- `item.raw.kgQueryResults`: Custom query results
- `item.raw.kgStats`: Graph statistics

---

## API Reference

### Knowledge Graph Service

```typescript
import {
  initNeo4jDriver,
  getSession,
  createEntity,
  createRelationship,
  queryEntitiesByType,
  findRelatedEntities,
  executeCypherQuery,
  getGraphStats,
  clearGraph,
  healthCheck,
} from './services/knowledge-graph';
```

#### `createEntity(entity: Entity): Promise<void>`

Create or update an entity in the graph.

```typescript
await createEntity({
  name: 'Sam Altman',
  type: 'person',
  properties: { role: 'CEO' },
  source: 'https://example.com/article',
  confidence: 0.95,
});
```

#### `createRelationship(rel: Relationship): Promise<void>`

Create a relationship between two entities.

```typescript
await createRelationship({
  from: 'Sam Altman',
  to: 'OpenAI',
  type: 'CEO_OF',
  properties: { since: '2023' },
  confidence: 0.9,
});
```

#### `queryEntitiesByType(type: string, limit?: number): Promise<Entity[]>`

Find all entities of a specific type.

```typescript
const organizations = await queryEntitiesByType('organization', 100);
```

#### `findRelatedEntities(entityName: string, relationshipType?: string, depth?: number)`

Find entities related to a given entity.

```typescript
const related = await findRelatedEntities('OpenAI', 'WORKS_FOR', 2);
```

#### `executeCypherQuery(query: string, params?: object): Promise<any[]>`

Execute a custom Cypher query.

```typescript
const results = await executeCypherQuery(
  'MATCH (n:Entity {type: $type}) RETURN n LIMIT $limit',
  { type: 'person', limit: 10 }
);
```

#### `getGraphStats(): Promise<GraphStats>`

Get statistics about the knowledge graph.

```typescript
const stats = await getGraphStats();
// {
//   entityCount: 1234,
//   relationshipCount: 5678,
//   entityTypes: [
//     { type: 'person', count: 500 },
//     { type: 'organization', count: 300 },
//     ...
//   ]
// }
```

---

## Usage Examples

### Example 1: Build a Tech Company Knowledge Graph

**Workflow:**
1. RSS Source → Tech news feed
2. Filter → Only articles about AI companies
3. **KG Extract** → Extract companies, people, technologies
4. **KG Query** → Find related companies
5. AI Summarize → Create summary with graph context
6. SMS Output → Send daily digest

**KG Extract Config:**
```json
{
  "entityTypes": ["organization", "person", "technology", "product"],
  "extractRelationships": true,
  "minConfidence": 0.7
}
```

**KG Query Config:**
```json
{
  "queryType": "relationship_search",
  "entityName": "OpenAI",
  "relationshipType": "COMPETES_WITH"
}
```

**Result:**
- Builds graph of AI companies, their employees, products
- Can query: "Who works at OpenAI?", "What companies compete with OpenAI?"
- Enriches articles with company context

---

### Example 2: Research Paper Network

**Workflow:**
1. arXiv Source → Latest ML papers
2. **KG Extract** → Extract authors, institutions, concepts
3. **KG Query** → Find authors and their collaborations
4. Generate report with citation network

**KG Extract Config:**
```json
{
  "entityTypes": ["person", "organization", "concept", "method"],
  "extractRelationships": true,
  "minConfidence": 0.6
}
```

**Result:**
- Maps research communities and collaborations
- Identifies trending concepts
- Finds prolific authors and institutions

---

### Example 3: Location-Based Intelligence

**Workflow:**
1. News API → Regional news
2. **KG Extract** → Extract locations, organizations, events
3. **KG Query** → Find events by location
4. Generate location-based insights

**KG Extract Config:**
```json
{
  "entityTypes": ["location", "organization", "event", "person"],
  "extractRelationships": true,
  "minConfidence": 0.7
}
```

**Cypher Query Example:**
```cypher
MATCH (e:Entity {type: 'event'})-[r:LOCATED_IN]->(l:Entity {type: 'location', name: 'San Francisco'})
RETURN e, r, l
```

---

## Best Practices

### 1. Entity Extraction

**Do:**
- ✅ Use specific entity types relevant to your domain
- ✅ Set appropriate confidence thresholds (0.6-0.8 for general use)
- ✅ Extract relationships for richer context
- ✅ Process items in batches to avoid rate limits

**Don't:**
- ❌ Extract too many entity types (keep it focused)
- ❌ Set confidence too low (creates noisy graph)
- ❌ Process hundreds of items at once (rate limits)

### 2. Graph Querying

**Do:**
- ✅ Start with simple queries (entity_lookup)
- ✅ Use relationship_search for contextual enrichment
- ✅ Add indexes for frequently queried properties
- ✅ Limit query results (use LIMIT in Cypher)

**Don't:**
- ❌ Query the entire graph without limits
- ❌ Use complex Cypher queries on every item (performance)
- ❌ Forget to handle empty results

### 3. Data Quality

**Do:**
- ✅ Review extracted entities periodically
- ✅ Merge duplicate entities (Sam Altman vs Samuel Altman)
- ✅ Validate high-confidence extractions
- ✅ Use canonical names for entities

**Don't:**
- ❌ Trust low-confidence extractions blindly
- ❌ Create entities without source attribution
- ❌ Ignore data quality issues

### 4. Performance

**Do:**
- ✅ Use `gpt-4o-mini` for cost efficiency
- ✅ Batch process items (5-10 at a time)
- ✅ Add delays between batches (1 second)
- ✅ Use Neo4j connection pooling (already configured)

**Don't:**
- ❌ Extract from every single item (filter first)
- ❌ Use `gpt-4o` unless accuracy is critical
- ❌ Open new connections for every query

---

## Troubleshooting

### Neo4j Connection Failed

**Error:** `❌ Neo4j credentials not found in environment`

**Solution:**
1. Check `.env.local` has Neo4j credentials
2. Verify `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` are set
3. Test connection: Wait 60 seconds after creating Aura instance

### OpenAI API Key Missing

**Error:** `❌ OPENAI_API_KEY not found in environment`

**Solution:**
1. Check `.env.local` has OpenAI API key
2. Verify key starts with `sk-proj-` or `sk-`

### Low Entity Count

**Problem:** KG Extract finds very few entities

**Solutions:**
1. Lower `minConfidence` threshold (try 0.5)
2. Add more entity types to extract
3. Check if content has enough information
4. Verify OpenAI API is working

### Query Returns No Results

**Problem:** KG Query returns empty results

**Solutions:**
1. Check entities exist in graph (run stats query first)
2. Verify entity/relationship names match exactly
3. Use `MATCH (n) RETURN n LIMIT 10` to see what's in graph
4. Check Cypher query syntax

### High Costs

**Problem:** OpenAI bills are high

**Solutions:**
1. Use `gpt-4o-mini` instead of `gpt-4o`
2. Increase `minConfidence` to extract fewer entities
3. Add filters before KG Extract node
4. Reduce entity types to extract

---

## Advanced: Custom Cypher Queries

### Find Most Connected Entities

```cypher
MATCH (n:Entity)
WITH n, size((n)-[]-()) as connections
RETURN n.name, n.type, connections
ORDER BY connections DESC
LIMIT 10
```

### Find Shortest Path Between Entities

```cypher
MATCH path = shortestPath(
  (start:Entity {name: 'Sam Altman'})-[*]-(end:Entity {name: 'Elon Musk'})
)
RETURN path
```

### Find Entities by Property

```cypher
MATCH (n:Entity)
WHERE n.properties.location = 'San Francisco'
RETURN n
```

### Get Entity with All Relationships

```cypher
MATCH (n:Entity {name: 'OpenAI'})-[r]-(related:Entity)
RETURN n, r, related
```

### Delete Old Entities

```cypher
MATCH (n:Entity)
WHERE n.updatedAt < datetime() - duration('P30D')  // Older than 30 days
DETACH DELETE n
```

---

## Monitoring & Maintenance

### View Graph Statistics

Add a **KG Query** node with `queryType: 'stats'` to any workflow to see:
- Total entity count
- Total relationship count
- Entity types breakdown

### Clear Entire Graph

**⚠️ DANGEROUS - This deletes everything!**

```typescript
import { clearGraph } from './services/knowledge-graph';

await clearGraph();  // Deletes all entities and relationships
```

### Backup Graph

Use Neo4j Aura console: https://console.neo4j.io
- Navigate to your instance
- Click "Backup" tab
- Create manual backup

---

## Resources

**Neo4j Documentation:**
- Cypher Query Language: https://neo4j.com/docs/cypher-manual/current/
- Graph Data Science: https://neo4j.com/docs/graph-data-science/current/

**Neo4j Aura Console:**
- https://console.neo4j.io
- Instance ID: `7d35811b`

**Vibeceo Knowledge Graph Files:**
- Service: `/sms-bot/src/agents/services/knowledge-graph.ts`
- Extract Pipeline: `/sms-bot/src/agents/pipeline/knowledge-graph-extract.ts`
- Query Pipeline: `/sms-bot/src/agents/pipeline/knowledge-graph-query.ts`
- Frontend Nodes: `/web/lib/node-palette.ts` (lines 609-637)
- Frontend Config: `/web/components/workflow/NodeConfigPanel.tsx` (lines 808-994)

---

*Last Updated: 2025-11-26*
