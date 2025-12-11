#!/usr/bin/env python3
"""Test a small crypto paper trade."""

from trading.alpaca_client import AlpacaClient

client = AlpacaClient(paper=True)

# Check account first
account = client.get_account()
print(f"Cash available: ${account['cash']:,.2f}")

# Get BTC price
btc_price = client.get_latest_price("BTC/USD")
print(f"BTC price: ${btc_price:,.2f}")

# Test buy $10 of BTC
print("\n" + "="*60)
print("TEST TRADE: Buying $10 of BTC/USD")
print("="*60)

result = client.buy("BTC/USD", 10.0, reason="Test crypto trade from Drift")

if result:
    print(f"✅ Order submitted!")
    print(f"   Order ID: {result['id']}")
    print(f"   Symbol: {result['symbol']}")
    print(f"   Amount: ${result['notional']}")
    print(f"   Status: {result['status']}")
else:
    print("❌ Order failed")
