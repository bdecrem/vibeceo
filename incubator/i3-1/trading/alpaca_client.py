"""
i3-1 Trading Agent - Alpaca API Client

Wrapper for Alpaca trading API with paper/live mode support.
All trading operations go through this client.

Requirements:
    pip install alpaca-py
"""

import os
import sys
from typing import Optional

# Add parent to path for config import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    ALPACA_API_KEY,
    ALPACA_SECRET_KEY,
    ALPACA_BASE_URL,
    TRADING_MODE,
    VERBOSE,
)
from utils.logger import log_error, log_info, log_warning, log_trade_executed


class AlpacaClient:
    """
    Wrapper for Alpaca trading API.

    Handles:
    - Account info and portfolio value
    - Position management
    - Order execution (market orders for simplicity)
    """

    def __init__(self, paper: bool = True):
        """
        Initialize Alpaca client.

        Args:
            paper: If True, use paper trading (default). If False, use live trading.
        """
        self.paper = paper
        self._client = None
        self._trading_client = None
        self._data_client = None

        # Validate credentials
        if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
            raise ValueError(
                "Missing Alpaca credentials. Set ALPACA_API_KEY and ALPACA_SECRET_KEY in .env.local"
            )

        # Safety check: prevent accidental live trading
        if not paper and TRADING_MODE != "live":
            raise ValueError(
                "Attempted to use live trading but TRADING_MODE != 'live'. "
                "Set TRADING_MODE=live in config to enable real money trading."
            )

        self._init_clients()

    def _init_clients(self):
        """Initialize Alpaca SDK clients."""
        try:
            from alpaca.trading.client import TradingClient
            from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient

            self._trading_client = TradingClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
                paper=self.paper,
            )

            # Data clients (no auth needed for crypto)
            self._crypto_data_client = CryptoHistoricalDataClient()
            self._stock_data_client = StockHistoricalDataClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
            )

            if VERBOSE:
                mode_str = "PAPER" if self.paper else "LIVE"
                log_info(f"Alpaca client initialized ({mode_str} mode)")

        except ImportError:
            raise ImportError(
                "alpaca-py not installed. Run: pip install alpaca-py"
            )
        except Exception as e:
            log_error("Alpaca client initialization", e)
            raise

    def get_account(self) -> dict:
        """Get account information."""
        try:
            account = self._trading_client.get_account()
            return {
                "id": account.id,
                "status": account.status,
                "cash": float(account.cash),
                "portfolio_value": float(account.portfolio_value),
                "buying_power": float(account.buying_power),
                "equity": float(account.equity),
                "currency": account.currency,
            }
        except Exception as e:
            log_error("get_account", e)
            raise

    def get_portfolio_value(self) -> float:
        """Get total portfolio value."""
        account = self.get_account()
        return account["portfolio_value"]

    def get_cash(self) -> float:
        """Get available cash."""
        account = self.get_account()
        return account["cash"]

    def get_positions(self) -> list[dict]:
        """Get all open positions."""
        try:
            positions = self._trading_client.get_all_positions()
            return [
                {
                    "symbol": pos.symbol,
                    "qty": float(pos.qty),
                    "side": pos.side,
                    "market_value": float(pos.market_value),
                    "cost_basis": float(pos.cost_basis),
                    "unrealized_pl": float(pos.unrealized_pl),
                    "unrealized_plpc": float(pos.unrealized_plpc),
                    "current_price": float(pos.current_price),
                    "avg_entry_price": float(pos.avg_entry_price),
                }
                for pos in positions
            ]
        except Exception as e:
            log_error("get_positions", e)
            return []

    def get_position(self, symbol: str) -> Optional[dict]:
        """Get position for a specific symbol."""
        try:
            # Normalize symbol (remove /USD for crypto)
            normalized = symbol.replace("/USD", "").replace("/", "")
            pos = self._trading_client.get_open_position(normalized)
            return {
                "symbol": pos.symbol,
                "qty": float(pos.qty),
                "side": pos.side,
                "market_value": float(pos.market_value),
                "cost_basis": float(pos.cost_basis),
                "unrealized_pl": float(pos.unrealized_pl),
                "unrealized_plpc": float(pos.unrealized_plpc),
                "current_price": float(pos.current_price),
                "avg_entry_price": float(pos.avg_entry_price),
            }
        except Exception:
            # No position for this symbol
            return None

    def buy(self, symbol: str, notional: float, reason: str = "") -> Optional[dict]:
        """
        Buy an asset using a notional (dollar) amount.

        Args:
            symbol: Asset symbol (e.g., "BTC/USD", "SPY")
            notional: Dollar amount to spend
            reason: Reason for the trade (for logging)

        Returns:
            Order dict if successful, None if failed
        """
        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            # Determine if crypto or stock
            is_crypto = "/" in symbol or (symbol.endswith("USD") and len(symbol) <= 7)

            # Normalize symbol for Alpaca
            if is_crypto:
                alpaca_symbol = symbol.replace("/", "")  # BTC/USD -> BTCUSD
            else:
                alpaca_symbol = symbol

            # Stocks with notional (fractional) orders require DAY time_in_force
            tif = TimeInForce.GTC if is_crypto else TimeInForce.DAY

            order_data = MarketOrderRequest(
                symbol=alpaca_symbol,
                notional=notional,
                side=OrderSide.BUY,
                time_in_force=tif,
            )

            order = self._trading_client.submit_order(order_data)

            result = {
                "id": str(order.id),
                "symbol": order.symbol,
                "side": "buy",
                "notional": notional,
                "status": order.status,
                "reason": reason,
            }

            if VERBOSE:
                log_trade_executed("BUY", symbol, notional, 1.0, str(order.id))

            return result

        except Exception as e:
            log_error(f"buy {symbol}", e)
            return None

    def sell(self, symbol: str, qty: Optional[float] = None, reason: str = "") -> Optional[dict]:
        """
        Sell an asset.

        Args:
            symbol: Asset symbol
            qty: Quantity to sell (if None, sell entire position)
            reason: Reason for the trade (for logging)

        Returns:
            Order dict if successful, None if failed
        """
        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            # Normalize symbol
            alpaca_symbol = symbol.replace("/USD", "USD").replace("/", "")

            # If no qty specified, sell entire position
            if qty is None:
                position = self.get_position(symbol)
                if not position:
                    log_warning(f"No position to sell for {symbol}")
                    return None
                qty = position["qty"]

            order_data = MarketOrderRequest(
                symbol=alpaca_symbol,
                qty=qty,
                side=OrderSide.SELL,
                time_in_force=TimeInForce.GTC,
            )

            order = self._trading_client.submit_order(order_data)

            result = {
                "id": str(order.id),
                "symbol": order.symbol,
                "side": "sell",
                "qty": qty,
                "status": order.status,
                "reason": reason,
            }

            if VERBOSE:
                log_trade_executed("SELL", symbol, qty, 0.0, str(order.id))

            return result

        except Exception as e:
            log_error(f"sell {symbol}", e)
            return None

    def get_latest_price(self, symbol: str) -> Optional[float]:
        """
        Get latest price for a symbol.

        Args:
            symbol: Asset symbol (e.g., "BTC/USD", "SPY")

        Returns:
            Latest price or None if unavailable
        """
        try:
            from alpaca.data.requests import CryptoLatestQuoteRequest, StockLatestQuoteRequest

            # Determine if crypto or stock
            is_crypto = "/" in symbol or (symbol.endswith("USD") and len(symbol) <= 7)

            if is_crypto:
                # Crypto - Alpaca expects format like "BTC/USD"
                if "/" not in symbol:
                    normalized = symbol[:-3] + "/" + symbol[-3:]
                else:
                    normalized = symbol
                request = CryptoLatestQuoteRequest(symbol_or_symbols=normalized)
                quotes = self._crypto_data_client.get_crypto_latest_quote(request)
                if normalized in quotes:
                    return float(quotes[normalized].ask_price)
            else:
                # Stock
                request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
                quotes = self._stock_data_client.get_stock_latest_quote(request)
                if symbol in quotes:
                    return float(quotes[symbol].ask_price)

            return None

        except Exception as e:
            log_error(f"get_latest_price {symbol}", e)
            return None

    def get_historical_bars(self, symbol: str, days: int = 30) -> list[dict]:
        """
        Get historical daily bars for a symbol.

        Args:
            symbol: Asset symbol (e.g., "BTC/USD", "SPY")
            days: Number of days of history (default 30)

        Returns:
            List of bars with {timestamp, open, high, low, close, volume}
            Most recent bar is last in the list.
        """
        try:
            from alpaca.data.requests import CryptoBarsRequest, StockBarsRequest
            from alpaca.data.timeframe import TimeFrame
            from datetime import datetime, timedelta

            end = datetime.now()
            start = end - timedelta(days=days)

            # Determine if crypto or stock
            is_crypto = "/" in symbol or symbol.endswith("USD") and len(symbol) <= 7

            if is_crypto:
                # Crypto - Alpaca expects format like "BTC/USD"
                if "/" not in symbol:
                    # Convert BTCUSD to BTC/USD
                    normalized = symbol[:-3] + "/" + symbol[-3:]
                else:
                    normalized = symbol
                request = CryptoBarsRequest(
                    symbol_or_symbols=normalized,
                    timeframe=TimeFrame.Day,
                    start=start,
                    end=end,
                )
                bars_response = self._crypto_data_client.get_crypto_bars(request)
                # BarSet uses dict-like access or .data attribute
                if hasattr(bars_response, 'data'):
                    bars_data = bars_response.data.get(normalized, [])
                elif hasattr(bars_response, '__getitem__'):
                    bars_data = bars_response[normalized] if normalized in bars_response else []
                else:
                    bars_data = []
            else:
                # Stock
                request = StockBarsRequest(
                    symbol_or_symbols=symbol,
                    timeframe=TimeFrame.Day,
                    start=start,
                    end=end,
                )
                bars_response = self._stock_data_client.get_stock_bars(request)
                # BarSet uses dict-like access or .data attribute
                if hasattr(bars_response, 'data'):
                    bars_data = bars_response.data.get(symbol, [])
                elif hasattr(bars_response, '__getitem__'):
                    bars_data = bars_response[symbol] if symbol in bars_response else []
                else:
                    bars_data = []

            # Convert to list of dicts
            bars = []
            for bar in bars_data:
                bars.append({
                    "timestamp": bar.timestamp.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": float(bar.volume),
                })

            return bars

        except Exception as e:
            log_error(f"get_historical_bars {symbol}", e)
            return []

    def get_close_prices(self, symbol: str, days: int = 30) -> list[float]:
        """
        Get historical close prices for a symbol.

        Convenience method that returns just the close prices.
        Most recent price is last in the list.

        Args:
            symbol: Asset symbol
            days: Number of days

        Returns:
            List of close prices
        """
        bars = self.get_historical_bars(symbol, days)
        return [bar["close"] for bar in bars]


def test_connection() -> bool:
    """
    Test Alpaca connection and print account info.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        client = AlpacaClient(paper=True)
        account = client.get_account()

        print("\n✅ Alpaca connection successful!")
        print(f"   Account ID: {account['id']}")
        print(f"   Status: {account['status']}")
        print(f"   Cash: ${account['cash']:,.2f}")
        print(f"   Portfolio Value: ${account['portfolio_value']:,.2f}")
        print(f"   Buying Power: ${account['buying_power']:,.2f}")

        positions = client.get_positions()
        print(f"   Open Positions: {len(positions)}")

        return True

    except Exception as e:
        print(f"\n❌ Alpaca connection failed: {e}")
        return False


if __name__ == "__main__":
    # Run connection test when executed directly
    test_connection()
