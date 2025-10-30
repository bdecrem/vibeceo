#!/bin/bash
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports
head -c 3000000 arxiv_papers_combined_2025-10-28.json | jq '.papers | sort_by(.author_notability_score) | reverse | .[8:20] | map({arxiv_id, title, abstract, authors, categories, author_notability_score, arxiv_url: ("https://arxiv.org/abs/" + .arxiv_id), pdf_url: ("https://arxiv.org/pdf/" + .arxiv_id + ".pdf")})' > papers_9_20.json
