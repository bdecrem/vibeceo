"""
Trader Agent - Alpaca API Client

Wrapper for Alpaca trading API.
Supports both LIVE and PAPER trading modes.
"""

import os
from typing import Optional
from datetime import datetime, timedelta
import pytz

from config import (
    ALPACA_API_KEY,
    ALPACA_SECRET_KEY,
    TRADING_MODE,
    VERBOSE,
)

# US Eastern timezone for stock market
ET = pytz.timezone('America/New_York')
PT = pytz.timezone('America/Los_Angeles')

# Market hours
MARKET_OPEN = (9, 30)   # 9:30 AM ET
MARKET_CLOSE = (16, 0)  # 4:00 PM ET


class AlpacaClient:
    """
    Wrapper for Alpaca trading API.
    Mode determined by TRADING_MODE env var.
    """

    def __init__(self, paper: bool = None):
        """
        Initialize Alpaca client.

        Args:
            paper: Override trading mode. If None, uses TRADING_MODE from config.
        """
        if paper is None:
            paper = TRADING_MODE != "live"

        self.paper = paper
        self._trading_client = None
        self._data_client = None

        if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
            raise ValueError(
                "Missing Alpaca credentials. Set ALPACA_API_KEY and ALPACA_SECRET_KEY."
            )

        # Safety check for live trading
        if not paper and TRADING_MODE != "live":
            raise ValueError(
                "Attempted live trading but TRADING_MODE != 'live'. "
                "Set TRADING_MODE=live to enable real money trading."
            )

        self._init_clients()

    def _init_clients(self):
        """Initialize Alpaca SDK clients."""
        try:
            from alpaca.trading.client import TradingClient
            from alpaca.data.historical import StockHistoricalDataClient

            self._trading_client = TradingClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
                paper=self.paper,
            )

            self._data_client = StockHistoricalDataClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
            )

            if VERBOSE:
                mode = "PAPER" if self.paper else "LIVE"
                print(f"[trader] Alpaca client initialized ({mode} mode)")

        except ImportError:
            raise ImportError("alpaca-py not installed. Run: pip install alpaca-py")

    def get_account(self) -> dict:
        """Get account information."""
        account = self._trading_client.get_account()
        return {
            "id": account.id,
            "status": account.status,
            "cash": float(account.cash),
            "portfolio_value": float(account.portfolio_value),
            "buying_power": float(account.buying_power),
            "equity": float(account.equity),
        }

    def get_positions(self) -> list[dict]:
        """Get all open positions."""
        positions = self._trading_client.get_all_positions()
        return [
            {
                "symbol": pos.symbol,
                "qty": float(pos.qty),
                "market_value": float(pos.market_value),
                "cost_basis": float(pos.cost_basis),
                "unrealized_pl": float(pos.unrealized_pl),
                "unrealized_plpc": float(pos.unrealized_plpc) * 100,
                "current_price": float(pos.current_price),
                "avg_entry_price": float(pos.avg_entry_price),
            }
            for pos in positions
        ]

    def get_position(self, symbol: str) -> Optional[dict]:
        """Get position for a specific symbol."""
        try:
            pos = self._trading_client.get_open_position(symbol)
            return {
                "symbol": pos.symbol,
                "qty": float(pos.qty),
                "market_value": float(pos.market_value),
                "cost_basis": float(pos.cost_basis),
                "unrealized_pl": float(pos.unrealized_pl),
                "unrealized_plpc": float(pos.unrealized_plpc) * 100,
                "current_price": float(pos.current_price),
                "avg_entry_price": float(pos.avg_entry_price),
            }
        except Exception:
            return None

    def buy(self, symbol: str, notional: float, reason: str = "") -> Optional[dict]:
        """Buy a stock using dollar amount (fractional shares)."""
        notional = round(notional, 2)

        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            order_data = MarketOrderRequest(
                symbol=symbol,
                notional=notional,
                side=OrderSide.BUY,
                time_in_force=TimeInForce.DAY,
            )

            order = self._trading_client.submit_order(order_data)

            result = {
                "id": str(order.id),
                "symbol": order.symbol,
                "side": "buy",
                "notional": notional,
                "status": str(order.status),
                "reason": reason,
                "timestamp": datetime.now(ET).isoformat(),
            }

            if VERBOSE:
                print(f"[trader] BUY {symbol} ${notional:.2f} - {reason}")

            return result

        except Exception as e:
            print(f"[trader] ERROR buying {symbol}: {e}")
            return None

    def sell(self, symbol: str, qty: Optional[float] = None, reason: str = "") -> Optional[dict]:
        """Sell a stock position."""
        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            # If no qty, sell entire position
            if qty is None:
                position = self.get_position(symbol)
                if not position:
                    print(f"[trader] No position to sell for {symbol}")
                    return None
                qty = position["qty"]

            order_data = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=OrderSide.SELL,
                time_in_force=TimeInForce.DAY,
            )

            order = self._trading_client.submit_order(order_data)

            result = {
                "id": str(order.id),
                "symbol": order.symbol,
                "side": "sell",
                "qty": qty,
                "status": str(order.status),
                "reason": reason,
                "timestamp": datetime.now(ET).isoformat(),
            }

            if VERBOSE:
                print(f"[trader] SELL {symbol} {qty} shares - {reason}")

            return result

        except Exception as e:
            print(f"[trader] ERROR selling {symbol}: {e}")
            return {"status": "error", "symbol": symbol, "error": str(e)}

    def get_latest_price(self, symbol: str) -> Optional[float]:
        """Get latest price for a stock."""
        try:
            from alpaca.data.requests import StockLatestQuoteRequest

            request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quotes = self._data_client.get_stock_latest_quote(request)

            if symbol in quotes:
                quote = quotes[symbol]
                if quote.bid_price and quote.ask_price:
                    return (float(quote.bid_price) + float(quote.ask_price)) / 2
                return float(quote.ask_price) if quote.ask_price else None

            return None

        except Exception as e:
            print(f"[trader] ERROR getting price for {symbol}: {e}")
            return None

    def get_bars(self, symbol: str, days: int = 30) -> list[dict]:
        """Get historical daily bars."""
        try:
            from alpaca.data.requests import StockBarsRequest
            from alpaca.data.timeframe import TimeFrame

            end = datetime.now()
            start = end - timedelta(days=days)

            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=TimeFrame.Day,
                start=start,
                end=end,
            )
            bars_response = self._data_client.get_stock_bars(request)

            if hasattr(bars_response, 'data'):
                bars_data = bars_response.data.get(symbol, [])
            elif hasattr(bars_response, '__getitem__'):
                bars_data = bars_response[symbol] if symbol in bars_response else []
            else:
                bars_data = []

            return [
                {
                    "timestamp": bar.timestamp.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": float(bar.volume),
                }
                for bar in bars_data
            ]

        except Exception as e:
            print(f"[trader] ERROR getting bars for {symbol}: {e}")
            return []


def is_market_open() -> bool:
    """Check if US stock market is currently open."""
    now = datetime.now(ET)

    # Weekend check
    if now.weekday() >= 5:
        return False

    # Hours check
    current_minutes = now.hour * 60 + now.minute
    open_minutes = MARKET_OPEN[0] * 60 + MARKET_OPEN[1]
    close_minutes = MARKET_CLOSE[0] * 60 + MARKET_CLOSE[1]

    return open_minutes <= current_minutes < close_minutes


def get_market_status() -> dict:
    """Get current market status."""
    now = datetime.now(ET)
    is_open = is_market_open()

    return {
        "is_open": is_open,
        "current_time_et": now.strftime("%Y-%m-%d %H:%M:%S ET"),
        "weekday": now.strftime("%A"),
    }


def test_connection() -> bool:
    """Test Alpaca connection."""
    try:
        client = AlpacaClient()
        account = client.get_account()
        mode = "PAPER" if client.paper else "LIVE"

        print(f"\n✅ Alpaca {mode} connection successful!")
        print(f"   Account ID: {account['id']}")
        print(f"   Status: {account['status']}")
        print(f"   Cash: ${account['cash']:,.2f}")
        print(f"   Portfolio Value: ${account['portfolio_value']:,.2f}")

        positions = client.get_positions()
        print(f"   Open Positions: {len(positions)}")

        market = get_market_status()
        print(f"   Market Open: {market['is_open']}")
        print(f"   Time (ET): {market['current_time_et']}")

        return True

    except Exception as e:
        print(f"\n❌ Alpaca connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
