#!/usr/bin/env python3
"""Liquidate all positions."""

from trading.alpaca_client import AlpacaClient

client = AlpacaClient(paper=True)

positions = client.get_positions()
print(f"Found {len(positions)} positions to liquidate:\n")

for p in positions:
    symbol = p['symbol']
    qty = p['qty']
    value = p['market_value']
    print(f"Selling {symbol}: {qty} (${value:.2f})...")

    result = client.sell(symbol, reason="Liquidating for clean start")

    if result:
        print(f"  ✅ {result['status']}")
    else:
        print(f"  ❌ Failed")

print("\nDone. Checking remaining positions...")
remaining = client.get_positions()
print(f"Positions remaining: {len(remaining)}")
