#!/bin/bash
# Backup Neo4j database before running fuzzy matching

BACKUP_DIR="/Users/bart/Documents/code/vibeceo/sms-bot/agents/arxiv-research-graph/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/authors_backup_$TIMESTAMP.json"

mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup of Author nodes..."
echo "Backup file: $BACKUP_FILE"

# Export all authors to JSON
python3 -c "
from neo4j import GraphDatabase
import json
import os

uri = os.getenv('NEO4J_URI')
username = os.getenv('NEO4J_USERNAME')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

with driver.session(database='neo4j') as session:
    result = session.run('MATCH (a:Author) RETURN a')
    authors = []
    for record in result:
        author = dict(record['a'])
        # Convert Neo4j types to JSON-serializable
        for key, value in author.items():
            if hasattr(value, 'iso_format'):
                author[key] = value.iso_format()
        authors.append(author)

    with open('$BACKUP_FILE', 'w') as f:
        json.dump(authors, f, indent=2)

    print(f'✅ Backed up {len(authors)} authors')

driver.close()
"

echo ""
echo "✅ Backup complete!"
echo "To restore: python3 restore_backup.py $BACKUP_FILE"
