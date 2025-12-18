"""
Drift (i3-2) - The Reasoning Trader

Main agent that runs the 15-minute trading cycle:
1. Light scan - Check positions and watchlist
2. Trigger detection - Identify what needs deeper research
3. Research mode - Agentic investigation with WebSearch
4. Decision - Buy, sell, hold, or pass
5. Execute - Place orders via Alpaca
6. Journal - Log everything

Uses claude-agent-sdk for agentic research with WebSearch.
"""

import os
import sys
from datetime import datetime
from typing import Optional
import json

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    WATCHLIST,
    CRYPTO_WATCHLIST,
    NEWS_MONITOR_LIST,
    MAX_POSITIONS,
    MAX_PORTFOLIO_VALUE,
    MIN_POSITION_SIZE,
    MIN_CONFIDENCE_TO_TRADE,
    SCAN_INTERVAL_MINUTES,
    RESEARCH_MODEL,
    SCAN_MODEL,
    MAX_RESEARCH_SEARCHES,
    RSI_OVERSOLD,
    RSI_OVERBOUGHT,
    PULLBACK_THRESHOLD,
    BREAKOUT_THRESHOLD,
    NEWS_MOVE_THRESHOLD,
    REQUIRE_UPTREND,
    UPTREND_MA_PERIOD,
    PROFIT_TARGET_PCT,
    STOP_CHECK_PCT,
    HARD_STOP_LOSS_PCT,
    SELL_BELOW_200MA,
    VERBOSE,
    STATE_DIR,
    SECTOR_MAP,
    MAX_POSITIONS_PER_SECTOR,
    MAX_CRYPTO_POSITIONS,
    TRADING_MODE,
    RESEARCH_COOLDOWN_MINUTES,
    RESEARCH_COOLDOWN_PRICE_OVERRIDE,
    NEWS_SCAN_INTERVAL_MINUTES,
    get_position_size,
    print_config,
)

# Memory file for recent decisions
MEMORY_FILE = STATE_DIR / "memory.md"
# Research cooldown tracking
RESEARCH_COOLDOWN_FILE = STATE_DIR / "research_cooldown.json"
# Last general news scan
NEWS_SCAN_FILE = STATE_DIR / "last_news_scan.json"
from trading.alpaca_client import AlpacaClient, is_market_open, get_market_status
from utils.pdt_tracker import PDTTracker
from utils.journal import TradeJournal
from utils.technicals import get_technical_signals, screen_for_triggers
from utils.logger import log
from utils.supabase_logger import CycleLogger

# Try to import anthropic for API calls
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("[Drift] Warning: anthropic package not installed")


class DriftAgent:
    """
    The Reasoning Trader - researches before trading.

    Core loop:
    1. Light scan every 15 minutes
    2. If triggers found, enter research mode
    3. Make decisions based on research
    4. Execute trades
    5. Log everything
    """

    def __init__(self, paper: bool = True):
        self.alpaca = AlpacaClient(paper=paper)
        self.pdt = PDTTracker()
        self.journal = TradeJournal()
        self.paper = paper

        # Initialize Anthropic client for research
        if ANTHROPIC_AVAILABLE:
            self.anthropic = anthropic.Anthropic()
        else:
            self.anthropic = None

    def _read_memory(self) -> str:
        """Read recent decisions from memory file."""
        if not MEMORY_FILE.exists():
            return ""
        try:
            content = MEMORY_FILE.read_text()
            # Skip the header, return just the entries
            if "---" in content:
                return content.split("---", 1)[1].strip()
            return ""
        except Exception:
            return ""

    def _write_memory(self, symbol: str, action: str, amount: str, thesis: str, confidence: int):
        """Append a decision to memory file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M ET")

        entry = f"""
## {symbol} - {action} {amount} - {timestamp}
**Thesis:** {thesis}
**Confidence:** {confidence}%

---
"""
        try:
            # Read existing content
            if MEMORY_FILE.exists():
                existing = MEMORY_FILE.read_text()
            else:
                existing = "# Drift Memory - Recent Decisions\n\n*Rolling log of trades and reasoning. Read before every research decision.*\n\n---\n"

            # Insert new entry after the header
            header_end = existing.find("---\n") + 4
            new_content = existing[:header_end] + entry + existing[header_end:]

            # Keep only last 20 entries (roughly 48 hours of active trading)
            entries = new_content.split("\n## ")
            if len(entries) > 21:  # header + 20 entries
                entries = entries[:21]
                new_content = "\n## ".join(entries)

            MEMORY_FILE.write_text(new_content)
        except Exception as e:
            if VERBOSE:
                log(f"[Drift] Memory write error: {e}")

    def _read_research_cooldown(self) -> dict:
        """Read research cooldown state (last research time + price per symbol)."""
        if not RESEARCH_COOLDOWN_FILE.exists():
            return {}
        try:
            return json.loads(RESEARCH_COOLDOWN_FILE.read_text())
        except Exception:
            return {}

    def _write_research_cooldown(self, symbol: str, price: float):
        """Record that we just researched a symbol."""
        cooldown = self._read_research_cooldown()
        cooldown[symbol] = {
            "timestamp": datetime.now().isoformat(),
            "price": price
        }
        # Clean up old entries (>24 hours)
        cutoff = datetime.now().timestamp() - 86400
        cooldown = {
            k: v for k, v in cooldown.items()
            if datetime.fromisoformat(v["timestamp"]).timestamp() > cutoff
        }
        try:
            RESEARCH_COOLDOWN_FILE.write_text(json.dumps(cooldown, indent=2))
        except Exception as e:
            if VERBOSE:
                log(f"[Drift] Cooldown write error: {e}")

    def _should_skip_research(self, symbol: str, current_price: float, is_held: bool) -> tuple[bool, str]:
        """
        Check if we should skip research due to cooldown.

        Returns (should_skip, reason)

        Skip if:
        - Researched within RESEARCH_COOLDOWN_MINUTES
        - AND price hasn't moved > RESEARCH_COOLDOWN_PRICE_OVERRIDE %
        - AND it's an existing position (new entries always research)
        """
        # Always research potential new entries
        if not is_held:
            return False, ""

        cooldown = self._read_research_cooldown()
        if symbol not in cooldown:
            return False, ""

        last = cooldown[symbol]
        last_time = datetime.fromisoformat(last["timestamp"])
        minutes_ago = (datetime.now() - last_time).total_seconds() / 60

        # Cooldown expired
        if minutes_ago >= RESEARCH_COOLDOWN_MINUTES:
            return False, ""

        # Check price change
        last_price = last.get("price", 0)
        if last_price > 0:
            price_change_pct = abs(current_price - last_price) / last_price * 100
            if price_change_pct >= RESEARCH_COOLDOWN_PRICE_OVERRIDE:
                return False, ""

        return True, f"Researched {int(minutes_ago)}min ago, price stable"

    def _read_last_news_scan(self) -> Optional[datetime]:
        """Read when we last did a general news scan."""
        if not NEWS_SCAN_FILE.exists():
            return None
        try:
            data = json.loads(NEWS_SCAN_FILE.read_text())
            return datetime.fromisoformat(data["timestamp"])
        except Exception:
            return None

    def _write_last_news_scan(self):
        """Record that we just did a general news scan."""
        try:
            NEWS_SCAN_FILE.write_text(json.dumps({
                "timestamp": datetime.now().isoformat()
            }))
        except Exception:
            pass

    def _should_do_news_scan(self) -> bool:
        """Check if it's time for hourly general news scan."""
        last_scan = self._read_last_news_scan()
        if last_scan is None:
            return True
        minutes_ago = (datetime.now() - last_scan).total_seconds() / 60
        return minutes_ago >= NEWS_SCAN_INTERVAL_MINUTES

    def _general_news_scan(self, cycle_logger: Optional['CycleLogger'] = None) -> list:
        """
        Hourly scan for major market-moving news.

        Catches: Fed announcements, geopolitical events, major company news
        outside our watchlist, etc.

        Returns list of news-driven triggers to research.
        """
        if not self._should_do_news_scan():
            return []

        if VERBOSE:
            log("[Drift] Running hourly general news scan...")

        # Use a single web search to check for major market news
        prompt = """You are Drift, a swing trader scanning for market-moving news.

Search for major financial/market news from the last 2 hours that could affect US stocks.

Look for:
- Fed/central bank announcements
- Major geopolitical events (wars, sanctions, disasters)
- Big tech/AI regulatory news
- Major earnings surprises from large companies
- Market-wide selloffs or rallies

DO NOT report routine price movements or minor news.

If you find something significant, respond with JSON:
{
    "has_major_news": true,
    "headlines": [
        {"topic": "Fed", "summary": "Fed signals rate cut pause", "affected_sectors": ["financials", "tech"]}
    ]
}

If nothing major, respond:
{"has_major_news": false, "headlines": []}
"""

        try:
            response = self._call_llm_with_tools(prompt)
            result = self._extract_json(response)

            self._write_last_news_scan()

            if result.get("has_major_news") and result.get("headlines"):
                if cycle_logger:
                    cycle_logger.add_entry(f"General news scan found {len(result['headlines'])} major items")

                # Convert to triggers for our held positions in affected sectors
                triggers = []
                positions = self.alpaca.get_positions()
                held_symbols = {p["symbol"] for p in positions}

                for headline in result.get("headlines", []):
                    affected = headline.get("affected_sectors", [])
                    # Check if any of our positions are in affected sectors
                    for symbol in held_symbols:
                        sector = SECTOR_MAP.get(symbol, "unknown")
                        if any(s.lower() in sector.lower() for s in affected):
                            triggers.append({
                                "symbol": symbol,
                                "trigger_type": "macro_news",
                                "reason": f"MACRO: {headline.get('summary', 'Major news')} - review {symbol} position",
                            })

                if VERBOSE and triggers:
                    log(f"[Drift] News scan generated {len(triggers)} triggers")

                return triggers

        except Exception as e:
            if VERBOSE:
                log(f"[Drift] General news scan error: {e}")

        return []

    def run_cycle(self, crypto_only: bool = False, cycle_number: int = 1) -> dict:
        """
        Run one trading cycle.

        Args:
            crypto_only: If True, only scan crypto assets (for after-hours trading)
            cycle_number: Cycle number for logging (default 1)

        Returns dict with cycle results.
        """
        cycle_start = datetime.now()

        # Determine which watchlist to use
        if crypto_only:
            active_watchlist = CRYPTO_WATCHLIST
            mode = "crypto"
            seek_deployment = False  # Don't aggressively deploy into crypto
        else:
            # Check if market is open for stocks
            market = get_market_status()
            if not market["is_open"]:
                return {
                    "status": "market_closed",
                    "message": f"Stock market closed. Time: {market['current_time_et']}",
                    "actions": [],
                }
            # Scan stocks AND crypto during market hours
            active_watchlist = WATCHLIST + CRYPTO_WATCHLIST
            mode = "stocks+crypto"

            # During market hours, check if we should seek deployment
            positions = self.alpaca.get_positions()
            current_invested = sum(p["market_value"] for p in positions)
            budget_remaining = MAX_PORTFOLIO_VALUE - current_invested
            seek_deployment = budget_remaining > MAX_PORTFOLIO_VALUE * 0.5  # Seek if >50% budget available

        # Initialize Supabase cycle logger
        cycle_logger = CycleLogger(cycle_number=cycle_number, mode=mode)

        # Capture portfolio snapshot
        try:
            account = self.alpaca.get_account()
            positions = self.alpaca.get_positions()
            cycle_logger.set_portfolio_snapshot(
                portfolio_value=account["portfolio_value"],
                cash=account["cash"],
                positions=positions,
            )
        except Exception as e:
            cycle_logger.add_entry(f"Error getting portfolio snapshot: {e}")

        if VERBOSE:
            log(f"[Drift] Scanning {mode}: {len(active_watchlist)} assets")
            if seek_deployment:
                log(f"[Drift] Cash >50% of budget - actively seeking entry opportunities")

        cycle_logger.add_entry(f"Scanning {mode}: {len(active_watchlist)} assets")
        if seek_deployment:
            cycle_logger.add_entry("Cash >50% of budget - actively seeking entry opportunities")

        # Step 1: Light scan
        scan_result = self._light_scan(watchlist=active_watchlist, seek_deployment=seek_deployment, cycle_logger=cycle_logger)

        # Step 1b: Hourly general news scan (catches macro events)
        news_triggers = self._general_news_scan(cycle_logger=cycle_logger)

        # Step 2: Check for triggers (combine technical + news)
        triggers = scan_result.get("triggers", []) + news_triggers
        cycle_logger.set_triggers_found(len(triggers))

        if not triggers:
            cycle_logger.add_entry("No triggers found - all stable")
            cycle_logger.complete(status="no_action", message=scan_result.get("summary", "All stable"))
            return {
                "status": "no_action",
                "message": scan_result.get("summary", "All stable"),
                "actions": [],
            }

        cycle_logger.add_entry(f"Found {len(triggers)} triggers to research")

        # Get actual cash and positions from Alpaca (use real balance, not calculated)
        try:
            account = self.alpaca.get_account()
            available_cash = account["cash"]
            current_positions = self.alpaca.get_positions()
            held_symbols = {p["symbol"] for p in current_positions}
        except Exception:
            available_cash = 0
            held_symbols = set()

        # Step 3: Research each trigger
        actions = []
        for trigger in triggers:
            # Skip BUY research if we don't have enough cash
            # (SELL and HOLD triggers for existing positions should still be researched)
            symbol = trigger.get("symbol", "")
            is_existing_position = symbol in held_symbols or symbol.replace("/", "") in held_symbols

            if not is_existing_position and available_cash < MIN_POSITION_SIZE:
                log(f"[Drift] Skipping {trigger.get('symbol')} research: insufficient cash (${available_cash:.2f} < ${MIN_POSITION_SIZE})")
                cycle_logger.add_entry(f"Skipped {trigger.get('symbol')}: insufficient cash for new position")
                continue

            # Check research cooldown (skip if we recently researched this symbol)
            current_price = self.alpaca.get_latest_price(symbol) or 0
            should_skip, skip_reason = self._should_skip_research(symbol, current_price, is_existing_position)
            if should_skip:
                if VERBOSE:
                    log(f"[Drift] Skipping {symbol} research: {skip_reason}")
                cycle_logger.add_entry(f"Skipped {symbol}: {skip_reason}")
                continue

            research_result = self._research(trigger, is_existing_position=is_existing_position, cycle_logger=cycle_logger)

            if research_result.get("decision") in ["buy", "sell"]:
                # Step 4: Execute
                execution = self._execute(research_result, cycle_logger=cycle_logger)
                actions.append(execution)

        # Complete the cycle log
        message = f"Processed {len(triggers)} triggers, {len(actions)} actions"
        cycle_logger.add_entry(message)
        cycle_logger.complete(status="completed", message=message)

        return {
            "status": "completed",
            "message": message,
            "triggers": triggers,
            "actions": actions,
            "cycle_time_seconds": (datetime.now() - cycle_start).total_seconds(),
        }

    def _light_scan(self, watchlist: list = None, seek_deployment: bool = False, cycle_logger: CycleLogger = None) -> dict:
        """
        Quantitative + News-reactive scan.

        Two-stage process:
        1. Quantitative screening: Calculate RSI, price changes for watchlist
        2. News scan: Check for big movers outside our watchlist

        Args:
            watchlist: List of symbols to scan. Defaults to WATCHLIST.
            seek_deployment: If True, actively look for entry opportunities
            cycle_logger: Optional CycleLogger instance for Supabase logging
        """
        if watchlist is None:
            watchlist = WATCHLIST

        try:
            # Get current state
            account = self.alpaca.get_account()
            positions = self.alpaca.get_positions()
            pdt_status = self.pdt.get_status()

            all_triggers = []
            thresholds = {
                "RSI_OVERSOLD": RSI_OVERSOLD,
                "RSI_OVERBOUGHT": RSI_OVERBOUGHT,
                "PULLBACK_THRESHOLD": PULLBACK_THRESHOLD,
                "BREAKOUT_THRESHOLD": BREAKOUT_THRESHOLD,
            }

            # ========== STAGE 1: Quantitative screening on watchlist ==========
            if VERBOSE:
                log(f"[Drift] Stage 1: Quantitative screening {len(watchlist)} symbols...")

            # Add trend filter settings to thresholds
            thresholds["REQUIRE_UPTREND"] = REQUIRE_UPTREND
            thresholds["UPTREND_MA_PERIOD"] = UPTREND_MA_PERIOD

            watchlist_signals = {}
            for symbol in watchlist:
                try:
                    # Fetch 365 calendar days to ensure 200+ trading days for 200MA
                    bars = self.alpaca.get_bars(symbol, days=365)
                    if bars:
                        signals = get_technical_signals(bars)
                        watchlist_signals[symbol] = signals

                        # Check for triggers (includes 200MA trend filter)
                        triggers = screen_for_triggers(symbol, signals, thresholds)
                        all_triggers.extend(triggers)
                except Exception as e:
                    if VERBOSE:
                        log(f"[Drift] Error getting data for {symbol}: {e}")

            # ========== HARD STOPS: Automatic exits, no LLM decision ==========
            # These are non-negotiable - capital preservation comes first
            hard_stop_sells = []
            for pos in positions:
                symbol = pos["symbol"]
                pnl_pct = pos["unrealized_plpc"]

                # Hard stop loss - sell immediately if down too much
                if pnl_pct <= HARD_STOP_LOSS_PCT:
                    if cycle_logger:
                        cycle_logger.add_entry(f"HARD STOP: {symbol} down {pnl_pct:.1f}% (limit: {HARD_STOP_LOSS_PCT}%)")
                    hard_stop_sells.append({
                        "symbol": symbol,
                        "reason": f"Hard stop hit: down {pnl_pct:.1f}% exceeds {HARD_STOP_LOSS_PCT}% limit",
                        "type": "hard_stop"
                    })
                    continue

                # 200MA breakdown - trend is broken
                if SELL_BELOW_200MA:
                    try:
                        bars = self.alpaca.get_bars(symbol, days=365)
                        if bars and len(bars) >= 200:
                            closes = [b["close"] for b in bars]
                            sma_200 = sum(closes[-200:]) / 200
                            current_price = closes[-1]
                            if current_price < sma_200:
                                pct_below = ((current_price - sma_200) / sma_200) * 100
                                if cycle_logger:
                                    cycle_logger.add_entry(f"200MA BREAKDOWN: {symbol} at ${current_price:.2f} is {pct_below:.1f}% below 200MA ${sma_200:.2f}")
                                hard_stop_sells.append({
                                    "symbol": symbol,
                                    "reason": f"200MA breakdown: price {pct_below:.1f}% below trend",
                                    "type": "trend_broken"
                                })
                    except Exception as e:
                        if VERBOSE:
                            log(f"[Drift] Error checking 200MA for {symbol}: {e}")

            # Execute hard stop sells
            for sell_signal in hard_stop_sells:
                symbol = sell_signal["symbol"]
                reason = sell_signal["reason"]
                if VERBOSE:
                    log(f"[Drift] HARD STOP SELL: {symbol} - {reason}")
                try:
                    order = self.alpaca.sell(symbol, reason=reason)
                    if order and order.get("status") != "error":
                        actions.append({
                            "action": "sell",
                            "symbol": symbol,
                            "reason": reason,
                            "type": sell_signal["type"],
                        })
                        if cycle_logger:
                            cycle_logger.add_entry(f"SOLD {symbol}: {reason}")
                except Exception as e:
                    if cycle_logger:
                        cycle_logger.add_entry(f"SELL FAILED {symbol}: {e}")

            # Update positions list after hard stops
            if hard_stop_sells:
                positions = self.alpaca.get_positions()

            # ========== STAGE 2: Check positions for exit triggers ==========
            for pos in positions:
                symbol = pos["symbol"]
                pnl_pct = pos["unrealized_plpc"]

                # Profit target hit
                if pnl_pct >= PROFIT_TARGET_PCT:
                    all_triggers.append({
                        "symbol": symbol,
                        "trigger_type": "profit_target",
                        "reason": f"Position up {pnl_pct:.1f}% - consider taking profits",
                        "signals": {"pnl_pct": pnl_pct},
                    })
                # Stop check
                elif pnl_pct <= STOP_CHECK_PCT:
                    all_triggers.append({
                        "symbol": symbol,
                        "trigger_type": "stop_check",
                        "reason": f"Position down {pnl_pct:.1f}% - thesis broken?",
                        "signals": {"pnl_pct": pnl_pct},
                    })

            # ========== STAGE 3: News-reactive scan for movers outside watchlist ==========
            if seek_deployment and VERBOSE:
                log(f"[Drift] Stage 3: News-reactive scan...")

            news_triggers = self._scan_news_movers(watchlist)
            all_triggers.extend(news_triggers)

            # ========== Build summary for LLM refinement ==========
            if all_triggers:
                # Check if ALL triggers are for positions we already hold
                held_symbols = {p["symbol"] for p in positions}
                held_symbols.update(p["symbol"].replace("/", "") for p in positions)  # Handle crypto format
                all_held = all(
                    t.get("symbol", "") in held_symbols or t.get("symbol", "").replace("/", "") in held_symbols
                    for t in all_triggers
                )

                # Skip LLM refinement if all triggers are for held positions
                # (saves ~$0.01 per cycle, and held positions go through cooldown anyway)
                if all_held:
                    if VERBOSE:
                        log(f"[Drift] All {len(all_triggers)} triggers are held positions - skipping LLM refinement")
                    result = {
                        "summary": f"All {len(all_triggers)} triggers are existing positions",
                        "triggers": [{"symbol": t["symbol"], "reason": t["reason"]} for t in all_triggers[:3]],
                    }
                else:
                    # Format triggers with actual data for LLM
                    trigger_summary = "\n".join([
                        f"- {t['symbol']}: {t['reason']}" +
                        (f" | RSI-2: {t['signals'].get('rsi_2', 'N/A')}" if 'rsi_2' in t.get('signals', {}) else "")
                        for t in all_triggers[:10]  # Cap at 10 to not overwhelm
                    ])

                    # Ask LLM to prioritize/filter
                    refine_prompt = f"""You are Drift, a curious skeptic swing trader.

QUANTITATIVE SCAN FOUND {len(all_triggers)} POTENTIAL TRIGGERS:
{trigger_summary}

CURRENT POSITIONS: {len(positions)}/{MAX_POSITIONS}
BUDGET REMAINING: ${MAX_PORTFOLIO_VALUE - sum(p['market_value'] for p in positions):.0f}

TASK: Pick the top 1-3 triggers worth researching RIGHT NOW. Consider:
- RSI-2 below 20 is a strong oversold signal
- Pullbacks in quality stocks > random movers
- News-driven moves need more research (could be opportunity or trap)

Respond in JSON:
{{
    "summary": "One line on market state",
    "triggers": [
        {{"symbol": "NVDA", "reason": "RSI-2 at 15, oversold in quality stock"}},
        ...
    ]
}}

Be selective. Quality over quantity. If nothing is compelling, return empty triggers."""

                    response = self._call_llm(refine_prompt, max_tokens=400)
                    try:
                        result = self._extract_json(response)
                    except Exception:
                        # Fall back to raw triggers
                        result = {
                            "summary": f"Found {len(all_triggers)} triggers",
                            "triggers": [{"symbol": t["symbol"], "reason": t["reason"]} for t in all_triggers[:3]],
                        }
            else:
                result = {
                    "summary": "No quantitative triggers found",
                    "triggers": [],
                    "all_stable": True,
                }

            # Log the scan
            self.journal.log_scan(
                portfolio_value=account["portfolio_value"],
                positions=positions,
                findings=result.get("summary", ""),
                triggers=[t.get("symbol", "") for t in result.get("triggers", [])],
            )

            # Log to Supabase
            if cycle_logger:
                cycle_logger.add_entry(f"Scan summary: {result.get('summary', 'N/A')}")
                for t in result.get("triggers", []):
                    cycle_logger.add_entry(f"Trigger: {t.get('symbol', '?')} - {t.get('reason', 'N/A')}")

            if VERBOSE:
                log(f"[Drift] Scan complete: {len(result.get('triggers', []))} triggers to research")

            return result

        except Exception as e:
            self.journal.log_error("light_scan", str(e))
            if cycle_logger:
                cycle_logger.add_entry(f"Scan error: {e}")
            return {"summary": f"Scan error: {e}", "triggers": [], "all_stable": True}

    def _scan_news_movers(self, exclude_symbols: list) -> list:
        """
        Scan for news-driven movers outside our watchlist.

        Uses web search to find stocks making big moves on news,
        then checks if any are worth researching.
        """
        news_triggers = []

        try:
            # Get news for broader monitoring list
            all_monitor = list(set(NEWS_MONITOR_LIST) - set(exclude_symbols))

            if not all_monitor:
                return []

            # Get news for monitored symbols
            news_items = self.alpaca.get_news(all_monitor[:30], limit=20)  # Cap to avoid rate limits

            # Look for stocks mentioned in multiple news items (hot)
            symbol_mentions = {}
            for item in news_items:
                for sym in item.get("symbols", []):
                    if sym in all_monitor and sym not in exclude_symbols:
                        symbol_mentions[sym] = symbol_mentions.get(sym, 0) + 1

            # Check price moves for hot symbols
            hot_symbols = [s for s, count in symbol_mentions.items() if count >= 2]

            for symbol in hot_symbols[:5]:  # Check top 5 most mentioned
                try:
                    bars = self.alpaca.get_bars(symbol, days=5)
                    if bars and len(bars) >= 2:
                        signals = get_technical_signals(bars)
                        change_1d = signals.get("change_1d", 0)

                        # Big move = news-driven trigger
                        if abs(change_1d) >= NEWS_MOVE_THRESHOLD:
                            direction = "up" if change_1d > 0 else "down"
                            news_triggers.append({
                                "symbol": symbol,
                                "trigger_type": "news_mover",
                                "reason": f"NEWS: {symbol} {direction} {abs(change_1d):.1f}% (in news {symbol_mentions[symbol]}x)",
                                "signals": signals,
                            })
                except Exception:
                    pass

        except Exception as e:
            if VERBOSE:
                log(f"[Drift] News scan error: {e}")

        return news_triggers

    def _research(self, trigger: dict, is_existing_position: bool = False, cycle_logger: CycleLogger = None) -> dict:
        """
        Deep research on a triggered symbol.

        This is where we go agentic - using WebSearch to investigate.

        Args:
            trigger: Trigger dict with symbol and reason
            is_existing_position: If True, use Sonnet (cheaper) for hold checks
            cycle_logger: Optional CycleLogger instance for Supabase logging
        """
        symbol = trigger.get("symbol", "")
        reason = trigger.get("reason", "")

        # Choose model: Sonnet for hold checks on existing positions, Opus for entry decisions
        use_model = SCAN_MODEL if is_existing_position else RESEARCH_MODEL
        if VERBOSE:
            model_name = "Sonnet" if is_existing_position else "Opus"
            log(f"[Drift] Using {model_name} for {'HOLD check' if is_existing_position else 'entry research'}")

        if VERBOSE:
            log(f"\n[Drift] Researching {symbol}: {reason}")

        # Get current position info if we hold it
        position = self.alpaca.get_position(symbol)
        is_entry = position is None

        # Read memory of recent decisions
        memory = self._read_memory()
        memory_section = ""
        if memory:
            # Filter to show only entries relevant to this symbol or recent (last 5)
            memory_lines = memory.split("\n## ")
            relevant = [m for m in memory_lines if symbol in m][:3]  # Last 3 for this symbol
            recent = memory_lines[:5]  # Last 5 overall
            combined = list(dict.fromkeys(relevant + recent))[:5]  # Dedupe, cap at 5
            if combined:
                memory_section = f"""
RECENT DECISIONS (your memory):
{"## ".join(combined)}

⚠️ CHECK YOUR MEMORY: If you recently traded {symbol}, consider whether new information
invalidates your previous thesis or if you're just reacting to noise.
"""

        # Check portfolio allocation - heightened scrutiny when over-invested
        over_invested_section = ""
        try:
            account = self.alpaca.get_account()
            cash = account["cash"]
            portfolio_value = account["portfolio_value"]
            cash_pct = (cash / portfolio_value * 100) if portfolio_value > 0 else 0

            if cash_pct < 10:  # Less than 10% cash = over-invested
                if VERBOSE:
                    log(f"[Drift] ⚠️ OVER-INVESTED: Cash ${cash:.2f} ({cash_pct:.1f}%) - heightened scrutiny active")
                over_invested_section = f"""
⚠️ OVER-INVESTED ALERT: Cash is only ${cash:.2f} ({cash_pct:.1f}% of portfolio).
Target is 15% cash reserve. You cannot buy new positions.

For EXISTING positions: Apply heightened scrutiny. Ask yourself:
- Is this thesis still valid, or am I holding out of inertia?
- Has the original catalyst played out?
- Would I buy this position today at current prices?
- Is there a better use of this capital if freed up?

Be more willing to SELL weak positions. "No edge, no trade" applies to holds too.
"""
        except Exception:
            pass  # Can't get account info, skip this section

        # Build research prompt
        research_prompt = f"""You are Drift, a curious skeptic swing trader researching {symbol}.

TRIGGER: {reason}

{"CURRENT POSITION:" if position else "POTENTIAL ENTRY:"}
{json.dumps(position, indent=2) if position else "No position - considering entry"}

PDT STATUS: {self.pdt.get_day_trades_remaining()} day trades remaining this week
{over_invested_section}{memory_section}
YOUR TASK:
1. Search for recent news about {symbol}
2. Search for analyst sentiment/ratings
3. Search for sector context
4. Synthesize findings into a thesis

Use web_search to investigate. Make 3-5 searches to build conviction.

After research, decide:
- BUY: If entry opportunity (no position) with good thesis
- SELL: If position should be closed
- HOLD: If position should be kept
- PASS: If not worth trading

Respond with your research process, then final JSON:
{{
    "symbol": "{symbol}",
    "decision": "buy|sell|hold|pass",
    "confidence": 0-100,
    "thesis": "One paragraph thesis",
    "searches_performed": ["search 1", "search 2", ...],
    "key_findings": ["finding 1", "finding 2", ...],
    "stop_loss_pct": 5,  // for buys
    "target_pct": 8      // for buys
}}"""

        # Call LLM with tools (model chosen based on position type)
        response = self._call_llm_with_tools(research_prompt, model=use_model)

        # Record cooldown (track that we researched this symbol)
        current_price = self.alpaca.get_latest_price(symbol) or 0
        self._write_research_cooldown(symbol, current_price)

        # Parse response
        try:
            result = self._extract_json(response)
            result["symbol"] = symbol
        except Exception:
            result = {
                "symbol": symbol,
                "decision": "pass",
                "confidence": 0,
                "thesis": "Research failed to produce clear result",
                "searches_performed": [],
                "key_findings": [],
            }

        # Log research
        self.journal.log_research(
            symbol=symbol,
            trigger=reason,
            searches=[{"query": s} for s in result.get("searches_performed", [])],
            findings="; ".join(result.get("key_findings", [])),
            decision=result.get("decision", "pass"),
            confidence=result.get("confidence", 0),
            thesis=result.get("thesis", ""),
        )

        # Log to Supabase
        if cycle_logger:
            cycle_logger.add_research(symbol, result)
            searches_count = len(result.get("searches_performed", []))
            if searches_count > 0:
                cycle_logger.add_web_searches(searches_count)
            cycle_logger.add_entry(
                f"Research {symbol}: {result.get('decision', 'pass').upper()} "
                f"(confidence: {result.get('confidence', 0)}%) - {result.get('thesis', '')[:100]}..."
            )

        if VERBOSE:
            log(f"[Drift] {symbol}: {result.get('decision', 'pass').upper()} "
                  f"(confidence: {result.get('confidence', 0)}%)")
            print(f"        Thesis: {result.get('thesis', '')[:150]}...")

        return result

    def _execute(self, research: dict, cycle_logger: CycleLogger = None) -> dict:
        """Execute a trade decision."""
        symbol = research.get("symbol")
        decision = research.get("decision")
        confidence = research.get("confidence", 0)
        thesis = research.get("thesis", "")

        # Check confidence threshold
        if confidence < MIN_CONFIDENCE_TO_TRADE:
            if VERBOSE:
                log(f"[Drift] {symbol}: Confidence {confidence}% below threshold, skipping")
            if cycle_logger:
                cycle_logger.add_entry(f"Skipped {symbol}: confidence {confidence}% below threshold")
            return {"status": "skipped", "reason": "Low confidence"}

        if decision == "buy":
            return self._execute_buy(symbol, confidence, thesis, research, cycle_logger=cycle_logger)
        elif decision == "sell":
            return self._execute_sell(symbol, thesis, confidence, cycle_logger=cycle_logger)
        else:
            return {"status": "no_action", "decision": decision}

    def _execute_buy(self, symbol: str, confidence: int, thesis: str, research: dict, cycle_logger: CycleLogger = None) -> dict:
        """Execute a buy order."""
        # Check if we already hold it
        if self.alpaca.get_position(symbol):
            if cycle_logger:
                cycle_logger.add_entry(f"Skipped {symbol} buy: already holding position")
            return {"status": "skipped", "reason": "Already holding position"}

        # Check position count
        positions = self.alpaca.get_positions()
        if len(positions) >= MAX_POSITIONS:
            return {"status": "skipped", "reason": f"Max positions ({MAX_POSITIONS}) reached"}

        # Check sector concentration - prevent all-in on correlated names
        # Crypto gets more slots since no PDT limits
        target_sector = SECTOR_MAP.get(symbol, "unknown")
        sector_limit = MAX_CRYPTO_POSITIONS if target_sector == "crypto" else MAX_POSITIONS_PER_SECTOR
        sector_count = sum(1 for p in positions if SECTOR_MAP.get(p["symbol"], "unknown") == target_sector)
        if sector_count >= sector_limit:
            if VERBOSE:
                log(f"[Drift] SECTOR LIMIT: {symbol} blocked - already have {sector_count} {target_sector} positions")
            return {"status": "skipped", "reason": f"Sector '{target_sector}' at max ({sector_limit} positions)"}

        # Get ACTUAL cash from Alpaca (not calculated from positions)
        try:
            account = self.alpaca.get_account()
            available_cash = account["cash"]
        except Exception as e:
            log(f"[Drift] ERROR getting account: {e}")
            return {"status": "failed", "reason": "Could not get account balance"}

        # Hard check: must have minimum position size available
        if available_cash < MIN_POSITION_SIZE:
            if VERBOSE:
                log(f"[Drift] Insufficient cash: ${available_cash:.2f} < ${MIN_POSITION_SIZE} minimum")
            return {"status": "skipped", "reason": f"Insufficient cash (${available_cash:.2f} < ${MIN_POSITION_SIZE})"}

        current_invested = sum(p["market_value"] for p in positions)
        if VERBOSE:
            log(f"[Drift] Budget: ${MAX_PORTFOLIO_VALUE} | Invested: ${current_invested:.2f} | Cash: ${available_cash:.2f}")

        size = get_position_size(confidence, available_cash)

        if size <= 0:
            return {"status": "skipped", "reason": "Insufficient funds or confidence"}

        # Get current price for stop/target calculation
        price = self.alpaca.get_latest_price(symbol)
        stop_loss_pct = research.get("stop_loss_pct", 5)
        target_pct = research.get("target_pct", 8)

        stop_loss = price * (1 - stop_loss_pct / 100) if price else None
        target = price * (1 + target_pct / 100) if price else None

        # Execute (pass full thesis - notify.py handles SMS formatting)
        order = self.alpaca.buy(symbol, size, reason=thesis)

        if order:
            # Record for PDT tracking
            self.pdt.record_buy(symbol)

            # Log entry
            self.journal.log_entry(
                symbol=symbol,
                notional=size,
                price=price or 0,
                confidence=confidence,
                thesis=thesis,
                stop_loss=stop_loss,
                target=target,
                order_id=order.get("id"),
            )

            # Write to memory
            self._write_memory(symbol, "BUY", f"${size:.0f}", thesis, confidence)

            # Log to Supabase
            if cycle_logger:
                cycle_logger.add_trade("buy", symbol, size, {
                    "status": "executed",
                    "order_id": order.get("id"),
                    "price": price,
                })
                cycle_logger.add_entry(f"EXECUTED BUY: {symbol} ${size:.2f} @ ${price:.2f}")

            return {
                "status": "executed",
                "action": "buy",
                "symbol": symbol,
                "notional": size,
                "order_id": order.get("id"),
            }

        if cycle_logger:
            cycle_logger.add_entry(f"FAILED: {symbol} buy order submission failed")
        return {"status": "failed", "reason": "Order submission failed"}

    def _execute_sell(self, symbol: str, thesis: str, confidence: int = 75, cycle_logger: CycleLogger = None) -> dict:
        """Execute a sell order."""
        position = self.alpaca.get_position(symbol)
        if not position:
            if cycle_logger:
                cycle_logger.add_entry(f"Skipped {symbol} sell: no position to sell")
            return {"status": "skipped", "reason": "No position to sell"}

        # Check PDT
        approved, pdt_reason = self.pdt.approve_sell(symbol)
        if not approved:
            if VERBOSE:
                log(f"[Drift] {symbol}: {pdt_reason}")
            if cycle_logger:
                cycle_logger.add_entry(f"Blocked {symbol} sell: {pdt_reason}")
            return {"status": "blocked", "reason": pdt_reason}

        # Check if it's a day trade
        is_day_trade = self.pdt.would_be_day_trade(symbol)

        # Execute (pass full thesis - notify.py handles SMS formatting)
        order = self.alpaca.sell(symbol, reason=thesis)

        if order:
            # Record day trade if applicable
            if is_day_trade:
                self.pdt.record_day_trade(
                    symbol=symbol,
                    buy_time=self.pdt.state["positions_opened_today"].get(symbol, ""),
                )

            # Calculate P&L
            pnl = position["unrealized_pl"]
            pnl_pct = position["unrealized_plpc"]

            # Log exit
            self.journal.log_exit(
                symbol=symbol,
                qty=position["qty"],
                entry_price=position["avg_entry_price"],
                exit_price=position["current_price"],
                pnl=pnl,
                pnl_pct=pnl_pct,
                reason=thesis,
                was_day_trade=is_day_trade,
            )

            # Write to memory
            pnl_str = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
            self._write_memory(symbol, "SOLD", f"({pnl_str})", thesis, confidence)

            # Log to Supabase
            if cycle_logger:
                cycle_logger.add_trade("sell", symbol, position["market_value"], {
                    "status": "executed",
                    "order_id": order.get("id"),
                    "pnl": pnl,
                    "pnl_pct": pnl_pct,
                })
                cycle_logger.add_entry(f"EXECUTED SELL: {symbol} {pnl_str} ({pnl_pct:+.1f}%)")

            return {
                "status": "executed",
                "action": "sell",
                "symbol": symbol,
                "qty": position["qty"],
                "pnl": pnl,
                "order_id": order.get("id"),
            }

        if cycle_logger:
            cycle_logger.add_entry(f"FAILED: {symbol} sell order submission failed")
        return {"status": "failed", "reason": "Order submission failed"}

    def _build_scan_context(self, account: dict, positions: list, pdt_status: dict) -> str:
        """Build context string for scan prompt."""
        lines = [
            f"Portfolio Value: ${account['portfolio_value']:,.2f}",
            f"Cash: ${account['cash']:,.2f}",
            f"Positions: {len(positions)}/{MAX_POSITIONS}",
            f"PDT: {pdt_status['day_trades_remaining']}/{pdt_status['max_day_trades']} day trades remaining",
            "",
            "CURRENT POSITIONS:",
        ]

        for pos in positions:
            pnl_sign = "+" if pos["unrealized_pl"] >= 0 else ""
            lines.append(
                f"  {pos['symbol']}: ${pos['market_value']:.2f} "
                f"({pnl_sign}{pos['unrealized_plpc']:.1f}%)"
            )

        if not positions:
            lines.append("  (none)")

        lines.extend([
            "",
            f"WATCHLIST: {', '.join(WATCHLIST[:10])}{'...' if len(WATCHLIST) > 10 else ''}",
        ])

        return "\n".join(lines)

    def _call_llm(self, prompt: str, max_tokens: int = 1000) -> str:
        """Call LLM without tools (for light scan). Uses cheaper SCAN_MODEL."""
        if not self.anthropic:
            return "{}"

        try:
            response = self.anthropic.messages.create(
                model=SCAN_MODEL,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            log(f"[Drift] LLM error: {e}")
            return "{}"

    def _call_llm_with_tools(self, prompt: str, model: str = None) -> str:
        """
        Call LLM with Anthropic's native WebSearch tool for research.

        Uses server-side web search - the API executes searches automatically.

        Args:
            prompt: The research prompt
            model: Model to use (defaults to RESEARCH_MODEL)
        """
        if not self.anthropic:
            return "{}"

        # Use specified model or default to RESEARCH_MODEL
        use_model = model or RESEARCH_MODEL

        # Use Anthropic's native web search tool (server-side execution)
        tools = [
            {
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": MAX_RESEARCH_SEARCHES,  # Cap searches per research session
            }
        ]

        try:
            # Single call - Anthropic handles web search execution server-side
            response = self.anthropic.messages.create(
                model=use_model,
                max_tokens=2000,
                tools=tools,
                messages=[{"role": "user", "content": prompt}],
            )

            # Log search usage if verbose
            if VERBOSE and hasattr(response, 'usage'):
                usage = response.usage
                if hasattr(usage, 'server_tool_use'):
                    searches = getattr(usage.server_tool_use, 'web_search_requests', 0)
                    if searches > 0:
                        log(f"[Drift] Web searches performed: {searches}")

            # Handle pause_turn (long-running turn was paused)
            if response.stop_reason == "pause_turn":
                # Continue the turn
                messages = [{"role": "user", "content": prompt}]
                messages.append({"role": "assistant", "content": response.content})

                continuation = self.anthropic.messages.create(
                    model=use_model,
                    max_tokens=2000,
                    tools=tools,
                    messages=messages,
                )
                response = continuation

            # Extract text from response (may include citations)
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            return final_text

        except Exception as e:
            log(f"[Drift] Research error: {e}")
            return "{}"

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from LLM response, handling nested structures."""
        import re

        # Strip markdown code blocks if present
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)

        # Find the outermost JSON object by matching braces
        start = text.find('{')
        if start == -1:
            return {}

        # Count braces to find the matching close
        depth = 0
        for i, char in enumerate(text[start:], start):
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    json_str = text[start:i+1]
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        break

        # Fallback: try the whole text
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        return {}

    def get_status(self) -> dict:
        """Get current agent status."""
        account = self.alpaca.get_account()
        positions = self.alpaca.get_positions()
        pdt = self.pdt.get_status()
        market = get_market_status()
        journal = self.journal.get_today_summary()

        return {
            "agent": "Drift",
            "mode": "paper" if self.paper else "LIVE",
            "market": market,
            "portfolio_value": account["portfolio_value"],
            "cash": account["cash"],
            "positions": len(positions),
            "pdt_remaining": pdt["day_trades_remaining"],
            "today_trades": journal["entries"] + journal["exits"],
            "today_pnl": journal["total_pnl"],
        }


def main():
    """Run a single trading cycle."""
    print("\n" + "=" * 60)
    print("DRIFT - THE REASONING TRADER")
    print("=" * 60)

    # Use config to determine paper vs live trading
    agent = DriftAgent(paper=(TRADING_MODE != "live"))

    # Show status
    status = agent.get_status()
    print(f"\nStatus:")
    print(f"  Market: {'OPEN' if status['market']['is_open'] else 'CLOSED'}")
    print(f"  Portfolio: ${status['portfolio_value']:,.2f}")
    print(f"  Cash: ${status['cash']:,.2f}")
    print(f"  Positions: {status['positions']}")
    print(f"  PDT remaining: {status['pdt_remaining']}")

    # Run cycle
    if status["market"]["is_open"]:
        print("\nRunning cycle...")
        result = agent.run_cycle()
        print(f"\nResult: {result['status']}")
        print(f"Message: {result['message']}")
        if result.get("actions"):
            print(f"Actions: {len(result['actions'])}")
            for action in result["actions"]:
                print(f"  - {action}")
    else:
        print("\nMarket closed, skipping cycle.")


if __name__ == "__main__":
    main()
