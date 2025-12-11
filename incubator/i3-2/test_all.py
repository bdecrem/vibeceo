#!/usr/bin/env python3
"""
Full integration test for Drift trading.
Run this after any changes to verify nothing broke.
"""

from trading.alpaca_client import AlpacaClient
import time

def test_all():
    print("="*60)
    print("DRIFT INTEGRATION TEST")
    print("="*60)

    client = AlpacaClient(paper=True)
    errors = []

    # 1. Account access
    print("\n1. Testing account access...")
    try:
        account = client.get_account()
        print(f"   ✅ Cash: ${account['cash']:,.2f}")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Account: {e}")

    # 2. Stock price
    print("\n2. Testing stock price (AAPL)...")
    try:
        price = client.get_latest_price("AAPL")
        if price:
            print(f"   ✅ AAPL: ${price:.2f}")
        else:
            print("   ❌ No price returned")
            errors.append("Stock price: None returned")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Stock price: {e}")

    # 3. Crypto price (both formats)
    print("\n3. Testing crypto price (BTC/USD)...")
    try:
        price = client.get_latest_price("BTC/USD")
        if price:
            print(f"   ✅ BTC/USD: ${price:,.2f}")
        else:
            print("   ❌ No price returned")
            errors.append("Crypto price: None returned")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Crypto price: {e}")

    # 4. _is_crypto detection
    print("\n4. Testing _is_crypto() detection...")
    test_cases = [
        ("AAPL", False),
        ("BTC/USD", True),
        ("BTCUSD", True),
        ("ETH/USD", True),
        ("ETHUSD", True),
        ("SPY", False),
        ("SOLUSD", True),
    ]
    for symbol, expected in test_cases:
        result = client._is_crypto(symbol)
        status = "✅" if result == expected else "❌"
        print(f"   {status} {symbol}: {result} (expected {expected})")
        if result != expected:
            errors.append(f"_is_crypto({symbol}): got {result}, expected {expected}")

    # 5. Positions
    print("\n5. Testing positions...")
    try:
        positions = client.get_positions()
        print(f"   ✅ {len(positions)} positions")
        for p in positions[:3]:
            print(f"      {p['symbol']}: {p['qty']}")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Positions: {e}")

    # 6. Crypto buy (minimum $10)
    print("\n6. Testing crypto buy ($10 ETH)...")
    try:
        result = client.buy("ETH/USD", 10.0, reason="Integration test")
        if result:
            print(f"   ✅ Order {result['status']}")
        else:
            print("   ❌ Order failed")
            errors.append("Crypto buy: returned None")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Crypto buy: {e}")

    # Wait for fill
    print("   Waiting 2s for fill...")
    time.sleep(2)

    # 7. Check position exists (might be ETHUSD format)
    print("\n7. Testing position lookup...")
    try:
        pos = client.get_position("ETH/USD") or client.get_position("ETHUSD")
        if pos:
            print(f"   ✅ Found ETH position: {pos['qty']}")
        else:
            print("   ⚠️  No ETH position (may have merged with existing)")
    except Exception as e:
        print(f"   ❌ {e}")
        errors.append(f"Position lookup: {e}")

    # Summary
    print("\n" + "="*60)
    if errors:
        print(f"FAILED: {len(errors)} errors")
        for e in errors:
            print(f"  - {e}")
    else:
        print("ALL TESTS PASSED ✅")
    print("="*60)

    return len(errors) == 0

if __name__ == "__main__":
    test_all()
