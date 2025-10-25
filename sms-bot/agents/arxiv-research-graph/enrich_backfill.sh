#!/bin/bash
# Quick wrapper to run enrichment backfill
# Enriches 1000 papers at a time, walking backward in time

cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/agents/arxiv-research-graph

python3 backfill_enrichment.py "$@"
