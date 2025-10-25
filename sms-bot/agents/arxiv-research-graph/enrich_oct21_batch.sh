#!/bin/bash
# Enrich the Oct 21 batch of papers (327 papers, 1,847 authors)

cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/agents/arxiv-research-graph

# Extract arxiv IDs from the Oct 21 papers file
ARXIV_IDS=$(python3 -c "
import json
with open('../../data/arxiv-reports/arxiv_papers_2025-10-21.json') as f:
    data = json.load(f)
    arxiv_ids = [p['arxiv_id'] for p in data['papers']]
    print(','.join(arxiv_ids))
")

echo "Running enrichment on 327 papers from Oct 21..."
echo "This will enrich approximately 1,847 unique authors"
echo ""

# Run the enrichment script
python3 enrich_authors.py --arxiv-ids "$ARXIV_IDS"

echo ""
echo "✅ Enrichment complete!"
