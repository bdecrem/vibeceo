"""
Drift (i3-2) Trading Agent - Alpaca API Client

Stock-focused wrapper for Alpaca trading API.
Adapted from i3-1 but simplified for stocks-only trading.

Requirements:
    pip install alpaca-py
"""

import os
import sys
from typing import Optional
from datetime import datetime, timedelta
import pytz

# Add parent to path for config import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    ALPACA_API_KEY,
    ALPACA_SECRET_KEY,
    TRADING_MODE,
    VERBOSE,
)
from notify import notify_trade

# US Eastern timezone for stock market
ET = pytz.timezone('America/New_York')

# Market hours
MARKET_OPEN = (9, 30)   # 9:30 AM ET
MARKET_CLOSE = (16, 0)  # 4:00 PM ET


class AlpacaClient:
    """
    Wrapper for Alpaca trading API (stocks + crypto).

    Handles:
    - Account info and portfolio value
    - Position management
    - Order execution (market orders)
    - Price and news data for stocks and crypto
    """

    def __init__(self, paper: bool = True):
        """Initialize Alpaca client."""
        self.paper = paper
        self._trading_client = None
        self._data_client = None
        self._crypto_data_client = None
        self._news_client = None

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
            from alpaca.data.historical import StockHistoricalDataClient, NewsClient
            from alpaca.data.historical import CryptoHistoricalDataClient

            self._trading_client = TradingClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
                paper=self.paper,
            )

            self._data_client = StockHistoricalDataClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
            )

            # Crypto data client (no auth needed for market data)
            self._crypto_data_client = CryptoHistoricalDataClient()

            self._news_client = NewsClient(
                api_key=ALPACA_API_KEY,
                secret_key=ALPACA_SECRET_KEY,
            )

            if VERBOSE:
                mode = "PAPER" if self.paper else "LIVE"
                print(f"[Drift] Alpaca client initialized ({mode} mode)")

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
            "day_trade_count": int(account.daytrade_count) if hasattr(account, 'daytrade_count') else 0,
        }

    def get_portfolio_value(self) -> float:
        """Get total portfolio value."""
        return self.get_account()["portfolio_value"]

    def get_cash(self) -> float:
        """Get available cash."""
        return self.get_account()["cash"]

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
                "unrealized_plpc": float(pos.unrealized_plpc) * 100,  # Convert to percentage
                "current_price": float(pos.current_price),
                "avg_entry_price": float(pos.avg_entry_price),
            }
            for pos in positions
        ]

    def get_position(self, symbol: str) -> Optional[dict]:
        """Get position for a specific symbol."""
        # Normalize symbol - Alpaca stores crypto as "BTCUSD" but we use "BTC/USD"
        symbols_to_try = [symbol]
        if self._is_crypto(symbol):
            # Try both formats
            symbols_to_try = [
                symbol.replace("/", ""),  # BTC/USD -> BTCUSD
                symbol if "/" in symbol else f"{symbol[:3]}/{symbol[3:]}",  # BTCUSD -> BTC/USD
            ]

        for sym in symbols_to_try:
            try:
                pos = self._trading_client.get_open_position(sym)
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
                continue
        return None  # No position

    def buy(self, symbol: str, notional: float, reason: str = "") -> Optional[dict]:
        """
        Buy a stock or crypto using dollar amount (fractional shares).

        Args:
            symbol: Stock symbol (e.g., "AAPL") or crypto (e.g., "BTC/USD")
            notional: Dollar amount to spend
            reason: Reason for trade (for logging)

        Returns:
            Order dict if successful, None if failed
        """
        # Alpaca requires notional to have max 2 decimal places
        notional = round(notional, 2)

        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            # Crypto requires GTC (good til canceled), stocks use DAY
            tif = TimeInForce.GTC if self._is_crypto(symbol) else TimeInForce.DAY

            order_data = MarketOrderRequest(
                symbol=symbol,
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
                "status": str(order.status),
                "reason": reason,
                "timestamp": datetime.now(ET).isoformat(),
            }

            if VERBOSE:
                print(f"[Drift] BUY {symbol} ${notional:.2f} - {reason}")

            # Send SMS notification
            notify_trade("BUY", symbol, notional, reason)

            return result

        except Exception as e:
            print(f"[Drift] ERROR buying {symbol}: {e}")
            return None

    def sell(self, symbol: str, qty: Optional[float] = None, reason: str = "") -> Optional[dict]:
        """
        Sell a stock or crypto position.

        Args:
            symbol: Stock symbol or crypto (e.g., "BTC/USD")
            qty: Quantity to sell (None = entire position)
            reason: Reason for trade

        Returns:
            Order dict if successful, None if failed
        """
        try:
            from alpaca.trading.requests import MarketOrderRequest
            from alpaca.trading.enums import OrderSide, TimeInForce

            # If no qty, sell entire position
            if qty is None:
                position = self.get_position(symbol)
                if not position:
                    print(f"[Drift] No position to sell for {symbol}")
                    return None
                qty = position["qty"]

            # Crypto requires GTC (good til canceled), stocks use DAY
            tif = TimeInForce.GTC if self._is_crypto(symbol) else TimeInForce.DAY

            order_data = MarketOrderRequest(
                symbol=symbol,
                qty=qty,
                side=OrderSide.SELL,
                time_in_force=tif,
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
                print(f"[Drift] SELL {symbol} {qty} shares - {reason}")

            # Send SMS notification
            notify_trade("SELL", symbol, qty, reason)

            return result

        except Exception as e:
            print(f"[Drift] ERROR selling {symbol}: {e}")
            # Return error dict so caller knows what went wrong
            return {"status": "error", "symbol": symbol, "error": str(e)}

    def _is_crypto(self, symbol: str) -> bool:
        """Check if symbol is a crypto asset."""
        # Crypto symbols are like "BTC/USD" or "BTCUSD" (positions)
        crypto_bases = ["BTC", "ETH", "AVAX", "SOL", "DOGE", "SHIB", "LTC", "LINK", "UNI", "AAVE"]
        symbol_upper = symbol.upper().replace("/", "")
        return any(symbol_upper.startswith(base) and symbol_upper.endswith("USD") for base in crypto_bases)

    def get_latest_price(self, symbol: str) -> Optional[float]:
        """Get latest price for a stock or crypto."""
        try:
            if self._is_crypto(symbol):
                from alpaca.data.requests import CryptoLatestQuoteRequest
                request = CryptoLatestQuoteRequest(symbol_or_symbols=symbol)
                quotes = self._crypto_data_client.get_crypto_latest_quote(request)
            else:
                from alpaca.data.requests import StockLatestQuoteRequest
                request = StockLatestQuoteRequest(symbol_or_symbols=symbol)
                quotes = self._data_client.get_stock_latest_quote(request)

            if symbol in quotes:
                quote = quotes[symbol]
                # Use midpoint of bid/ask, or ask if no bid
                if quote.bid_price and quote.ask_price:
                    return (float(quote.bid_price) + float(quote.ask_price)) / 2
                return float(quote.ask_price) if quote.ask_price else None

            return None

        except Exception as e:
            print(f"[Drift] ERROR getting price for {symbol}: {e}")
            return None

    def get_latest_prices(self, symbols: list[str]) -> dict[str, float]:
        """Get latest prices for multiple stocks/crypto."""
        # Split symbols into stocks and crypto
        stocks = [s for s in symbols if not self._is_crypto(s)]
        crypto = [s for s in symbols if self._is_crypto(s)]

        prices = {}

        # Fetch stock prices
        if stocks:
            try:
                from alpaca.data.requests import StockLatestQuoteRequest
                request = StockLatestQuoteRequest(symbol_or_symbols=stocks)
                quotes = self._data_client.get_stock_latest_quote(request)

                for symbol in stocks:
                    if symbol in quotes:
                        quote = quotes[symbol]
                        if quote.bid_price and quote.ask_price:
                            prices[symbol] = (float(quote.bid_price) + float(quote.ask_price)) / 2
                        elif quote.ask_price:
                            prices[symbol] = float(quote.ask_price)
            except Exception as e:
                print(f"[Drift] ERROR getting stock prices: {e}")

        # Fetch crypto prices
        if crypto:
            try:
                from alpaca.data.requests import CryptoLatestQuoteRequest
                request = CryptoLatestQuoteRequest(symbol_or_symbols=crypto)
                quotes = self._crypto_data_client.get_crypto_latest_quote(request)

                for symbol in crypto:
                    if symbol in quotes:
                        quote = quotes[symbol]
                        if quote.bid_price and quote.ask_price:
                            prices[symbol] = (float(quote.bid_price) + float(quote.ask_price)) / 2
                        elif quote.ask_price:
                            prices[symbol] = float(quote.ask_price)
            except Exception as e:
                print(f"[Drift] ERROR getting crypto prices: {e}")

        return prices

    def get_bars(self, symbol: str, days: int = 30) -> list[dict]:
        """Get historical daily bars for stocks or crypto."""
        try:
            from alpaca.data.timeframe import TimeFrame

            end = datetime.now()
            start = end - timedelta(days=days)

            if self._is_crypto(symbol):
                # Crypto bars use different client and request type
                from alpaca.data.requests import CryptoBarsRequest

                # Crypto bars API needs format like "BTC/USD"
                # (with slash, unlike some other endpoints)
                crypto_symbol = symbol if "/" in symbol else f"{symbol[:3]}/{symbol[3:]}"

                request = CryptoBarsRequest(
                    symbol_or_symbols=crypto_symbol,
                    timeframe=TimeFrame.Day,
                    start=start,
                    end=end,
                )
                bars_response = self._crypto_data_client.get_crypto_bars(request)
                lookup_symbol = crypto_symbol
            else:
                from alpaca.data.requests import StockBarsRequest

                request = StockBarsRequest(
                    symbol_or_symbols=symbol,
                    timeframe=TimeFrame.Day,
                    start=start,
                    end=end,
                )
                bars_response = self._data_client.get_stock_bars(request)
                lookup_symbol = symbol

            # Extract bars
            if hasattr(bars_response, 'data'):
                bars_data = bars_response.data.get(lookup_symbol, [])
            elif hasattr(bars_response, '__getitem__'):
                bars_data = bars_response[lookup_symbol] if lookup_symbol in bars_response else []
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
            print(f"[Drift] ERROR getting bars for {symbol}: {e}")
            return []

    def get_news(self, symbols: list[str], limit: int = 10) -> list[dict]:
        """
        Get recent news for symbols.

        Returns list of news items with headline, summary, symbols, timestamp.
        """
        try:
            from alpaca.data.requests import NewsRequest

            # Alpaca expects comma-separated string for symbols
            symbols_str = ",".join(symbols) if isinstance(symbols, list) else symbols

            request = NewsRequest(
                symbols=symbols_str,
                limit=limit,
            )

            news_response = self._news_client.get_news(request)

            # NewsSet stores news in data['news'] as list of News objects
            news_items = news_response.data.get('news', [])

            return [
                {
                    "headline": item.headline,
                    "summary": item.summary or "",
                    "symbols": item.symbols,
                    "source": item.source,
                    "timestamp": item.created_at.isoformat() if item.created_at else "",
                    "url": item.url or "",
                }
                for item in news_items
            ]

        except Exception as e:
            print(f"[Drift] ERROR getting news: {e}")
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
        client = AlpacaClient(paper=True)
        account = client.get_account()

        print("\n✅ Alpaca connection successful!")
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
