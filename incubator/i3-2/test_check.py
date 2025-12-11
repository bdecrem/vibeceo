#!/usr/bin/env python3
"""Check positions and recent orders."""

from trading.alpaca_client import AlpacaClient

client = AlpacaClient(paper=True)

# Check all positions
positions = client.get_positions()
print(f"All positions ({len(positions)}):")
for p in positions:
    print(f"  {p['symbol']}: {p['qty']} (${p['market_value']:.2f})")

# Check recent orders
print("\nRecent orders:")
orders = client._trading_client.get_orders(status="all", limit=10)
for o in orders:
    qty_str = f"{o.filled_qty}/{o.qty}" if o.qty else f"${o.notional}"
    print(f"  {o.side.name} {o.symbol}: {o.status.name} - {qty_str}")
