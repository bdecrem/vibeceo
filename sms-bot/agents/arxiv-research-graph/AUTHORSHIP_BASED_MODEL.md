# Authorship-Based Author Model

## Overview

We've redesigned the author system to properly handle author deduplication using fuzzy matching.

## The Problem with the Old System

**Old approach:**
```cypher
MERGE (a:Author {name: $name})  // One node per unique name
```

**Issues:**
- "John Doe" at Stanford + "John Doe" at MIT = same Author node ❌
- Can't distinguish between multiple people with same name
- 292K Author nodes for 845K authorships (incorrect merging)

## The New System

### 1. Authorship-Based Author Nodes

**New approach:**
```cypher
CREATE (a:Author)  // One node per authorship
SET a.kochi_author_id = 'KA_' + randomUUID()
```

**Result:**
- Each paper appearance creates a NEW Author node with unique KID
- 845K Author nodes for 845K authorships (1:1 mapping)
- "John Doe" appears on 100 papers = 100 Author nodes with 100 different KIDs

### 2. Canonical KID System

**Fields added to Author nodes:**
- `canonical_kid`: Points to the "canonical" author (the real person)
- `canonical_confidence`: Match confidence (0-100)
- `is_canonical`: True if this node IS the canonical one
- `needs_review`: True if match is uncertain (60-79% confidence)

**Example:**
```
Author node 1: John Doe (Stanford)
- kochi_author_id: KA_abc123
- canonical_kid: KA_abc123  (points to self)
- is_canonical: true

Author node 2: John Doe (Stanford)
- kochi_author_id: KA_def456
- canonical_kid: KA_abc123  (points to node 1)
- canonical_confidence: 95

Author node 3: John Doe (MIT)
- kochi_author_id: KA_ghi789
- canonical_kid: KA_ghi789  (different person, points to self)
- is_canonical: true
```

### 3. Fuzzy Matching Logic

**Three signals (0-100 score):**
1. **Co-author overlap** (0-50 pts): Same person publishes with same collaborators
2. **Name + affiliation** (0-30 pts): Exact name + institution match
3. **Research area** (0-20 pts): Shared paper categories

**Decision thresholds:**
- **≥80%**: Assign canonical_kid to existing canonical author
- **60-79%**: Assign canonical_kid but mark needs_review=true
- **<60%**: Mark as own canonical (different person)

### 4. Querying by Person

**Old way (broken):**
```cypher
MATCH (a:Author {name: "John Doe"})-[:AUTHORED]->(p:Paper)
// Returns ALL John Doe papers (multiple people!)
```

**New way (correct):**
```cypher
MATCH (a:Author {canonical_kid: "KA_abc123"})-[:AUTHORED]->(p:Paper)
// Returns papers by ONE specific person
```

## Migration Process

### Step 1: Backup
```bash
python3 migrate_to_authorship_based_authors.py --dry-run
```

### Step 2: Run Migration
```bash
python3 migrate_to_authorship_based_authors.py
```

**What it does:**
- For each AUTHORED relationship (845K total):
  - Creates NEW Author node with unique KID
  - Copies name, affiliation from old Author node
  - Links to Paper
- Deletes old Author nodes
- Result: 292K → 845K Author nodes

### Step 3: Test on Small Dataset
```bash
# Test on October 12 (222 papers, 1,143 authors)
python3 migrate_to_authorship_based_authors.py --paper-limit 222
```

### Step 4: Assign Canonical KIDs
```bash
python3 kochi_fuzzy_match_v2.py --all
```

## Files Changed

### 1. `load_recent_papers.py`
**Changed:**
```cypher
MERGE (a:Author {name: author_map.name})  // OLD
CREATE (a:Author)                          // NEW
SET a.kochi_author_id = 'KA_' + randomUUID()
```

**Impact:** All future papers will create new Author nodes per authorship

### 2. `kochi_fuzzy_match_v2.py` (NEW)
**Purpose:** Assigns canonical_kid to Author nodes

**Usage:**
```bash
python3 kochi_fuzzy_match_v2.py --all                    # Process all authors
python3 kochi_fuzzy_match_v2.py --limit 1000 --dry-run  # Test on 1000 authors
```

### 3. `migrate_to_authorship_based_authors.py` (NEW)
**Purpose:** One-time migration from old to new model

**Usage:**
```bash
python3 migrate_to_authorship_based_authors.py --dry-run      # Preview
python3 migrate_to_authorship_based_authors.py --paper-limit 10  # Test
python3 migrate_to_authorship_based_authors.py                # Full migration
```

## Benefits

### ✅ Proper Deduplication
- Can distinguish "John Doe" at Stanford from "John Doe" at MIT
- Fuzzy matching identifies which are the same person

### ✅ Non-Destructive
- All source data preserved (each paper appearance = Author node)
- Canonical assignments can be updated/corrected
- No data loss

### ✅ Queryable
- Query by canonical_kid for accurate author queries
- Filter by needs_review=true for human review
- Aggregate statistics per real person (not per name)

### ✅ Scalable
- Handles millions of authors
- Can re-run fuzzy matching with improved algorithms
- Can manually override canonical assignments

## Next Steps

1. **Run migration on full database** (845K authorships)
2. **Assign canonical_kid to all authors** using fuzzy matcher
3. **Review uncertain matches** (needs_review=true)
4. **Update query tools** to use canonical_kid instead of name
5. **Build dashboard** for human review of uncertain matches

## Rollback Plan

If migration fails:
1. Restore from backup (created automatically)
2. Revert `load_recent_papers.py` to use MERGE
3. Delete new Author nodes: `MATCH (a:Author WHERE a.migrated_from_old_system = true) DELETE a`

## Performance Notes

**Migration time estimates:**
- 10 papers: ~5 seconds
- 1,000 papers: ~2 minutes
- 10,000 papers: ~20 minutes
- 160,000 papers (full): ~5-6 hours

**Fuzzy matching time estimates:**
- 1,000 authors: ~3 minutes
- 10,000 authors: ~30 minutes
- 845,000 authors (full): ~40-50 hours

Consider running in batches or in background.
