#!/usr/bin/env python3
"""Test the research flow on BTC."""

from agent import DriftAgent
import json

agent = DriftAgent(paper=True)

# Force a research trigger on BTC
trigger = {'symbol': 'BTC/USD', 'reason': 'Testing research flow - checking for entry opportunity'}
result = agent._research(trigger)

print('\n' + '='*60)
print('RESEARCH RESULT:')
print('='*60)
print(json.dumps(result, indent=2))
