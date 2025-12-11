#!/usr/bin/env python3
"""Test selling the BTC position."""

from trading.alpaca_client import AlpacaClient

client = AlpacaClient(paper=True)

# Try both symbol formats
for symbol in ["BTC/USD", "BTCUSD"]:
    position = client.get_position(symbol)
    if position:
        print(f"Found position with symbol '{symbol}':")
        print(f"  Qty: {position['qty']} BTC (${position['market_value']:.2f})")
        print(f"  P&L: ${position['unrealized_pl']:.2f} ({position['unrealized_plpc']:.2f}%)")

        print("\n" + "="*60)
        print(f"TEST TRADE: Selling all {symbol}")
        print("="*60)

        result = client.sell(symbol, reason="Test sell from Drift")

        if result:
            print(f"✅ Sell order submitted!")
            print(f"   Order ID: {result['id']}")
            print(f"   Qty: {result['qty']}")
            print(f"   Status: {result['status']}")
        else:
            print("❌ Sell order failed")
        break
else:
    print("No BTC position found with either symbol format")
