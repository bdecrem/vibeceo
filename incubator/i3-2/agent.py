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
    MIN_CONFIDENCE_TO_TRADE,
    SCAN_INTERVAL_MINUTES,
    RESEARCH_MODEL,
    MAX_RESEARCH_SEARCHES,
    RSI_OVERSOLD,
    RSI_OVERBOUGHT,
    PULLBACK_THRESHOLD,
    BREAKOUT_THRESHOLD,
    NEWS_MOVE_THRESHOLD,
    PROFIT_TARGET_PCT,
    STOP_CHECK_PCT,
    VERBOSE,
    STATE_DIR,
    SECTOR_MAP,
    MAX_POSITIONS_PER_SECTOR,
    MAX_CRYPTO_POSITIONS,
    TRADING_MODE,
    get_position_size,
    print_config,
)

# Memory file for recent decisions
MEMORY_FILE = STATE_DIR / "memory.md"
from trading.alpaca_client import AlpacaClient, is_market_open, get_market_status
from utils.pdt_tracker import PDTTracker
from utils.journal import TradeJournal
from utils.technicals import get_technical_signals, screen_for_triggers
from utils.logger import log

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

    def run_cycle(self, crypto_only: bool = False) -> dict:
        """
        Run one trading cycle.

        Args:
            crypto_only: If True, only scan crypto assets (for after-hours trading)

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

        if VERBOSE:
            log(f"[Drift] Scanning {mode}: {len(active_watchlist)} assets")
            if seek_deployment:
                log(f"[Drift] Cash >50% of budget - actively seeking entry opportunities")

        # Step 1: Light scan
        scan_result = self._light_scan(watchlist=active_watchlist, seek_deployment=seek_deployment)

        # Step 2: Check for triggers
        triggers = scan_result.get("triggers", [])

        if not triggers:
            return {
                "status": "no_action",
                "message": scan_result.get("summary", "All stable"),
                "actions": [],
            }

        # Step 3: Research each trigger
        actions = []
        for trigger in triggers:
            research_result = self._research(trigger)

            if research_result.get("decision") in ["buy", "sell"]:
                # Step 4: Execute
                execution = self._execute(research_result)
                actions.append(execution)

        return {
            "status": "completed",
            "message": f"Processed {len(triggers)} triggers, {len(actions)} actions",
            "triggers": triggers,
            "actions": actions,
            "cycle_time_seconds": (datetime.now() - cycle_start).total_seconds(),
        }

    def _light_scan(self, watchlist: list = None, seek_deployment: bool = False) -> dict:
        """
        Quantitative + News-reactive scan.

        Two-stage process:
        1. Quantitative screening: Calculate RSI, price changes for watchlist
        2. News scan: Check for big movers outside our watchlist

        Args:
            watchlist: List of symbols to scan. Defaults to WATCHLIST.
            seek_deployment: If True, actively look for entry opportunities
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

            watchlist_signals = {}
            for symbol in watchlist:
                try:
                    bars = self.alpaca.get_bars(symbol, days=60)
                    if bars:
                        signals = get_technical_signals(bars)
                        watchlist_signals[symbol] = signals

                        # Check for triggers
                        triggers = screen_for_triggers(symbol, signals, thresholds)
                        all_triggers.extend(triggers)
                except Exception as e:
                    if VERBOSE:
                        log(f"[Drift] Error getting data for {symbol}: {e}")

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

            if VERBOSE:
                log(f"[Drift] Scan complete: {len(result.get('triggers', []))} triggers to research")

            return result

        except Exception as e:
            self.journal.log_error("light_scan", str(e))
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

    def _research(self, trigger: dict) -> dict:
        """
        Deep research on a triggered symbol.

        This is where we go agentic - using WebSearch to investigate.
        """
        symbol = trigger.get("symbol", "")
        reason = trigger.get("reason", "")

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

        # Build research prompt
        research_prompt = f"""You are Drift, a curious skeptic swing trader researching {symbol}.

TRIGGER: {reason}

{"CURRENT POSITION:" if position else "POTENTIAL ENTRY:"}
{json.dumps(position, indent=2) if position else "No position - considering entry"}

PDT STATUS: {self.pdt.get_day_trades_remaining()} day trades remaining this week
{memory_section}
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

        # Call LLM with tools
        response = self._call_llm_with_tools(research_prompt)

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

        if VERBOSE:
            log(f"[Drift] {symbol}: {result.get('decision', 'pass').upper()} "
                  f"(confidence: {result.get('confidence', 0)}%)")
            print(f"        Thesis: {result.get('thesis', '')[:150]}...")

        return result

    def _execute(self, research: dict) -> dict:
        """Execute a trade decision."""
        symbol = research.get("symbol")
        decision = research.get("decision")
        confidence = research.get("confidence", 0)
        thesis = research.get("thesis", "")

        # Check confidence threshold
        if confidence < MIN_CONFIDENCE_TO_TRADE:
            if VERBOSE:
                log(f"[Drift] {symbol}: Confidence {confidence}% below threshold, skipping")
            return {"status": "skipped", "reason": "Low confidence"}

        if decision == "buy":
            return self._execute_buy(symbol, confidence, thesis, research)
        elif decision == "sell":
            return self._execute_sell(symbol, thesis, confidence)
        else:
            return {"status": "no_action", "decision": decision}

    def _execute_buy(self, symbol: str, confidence: int, thesis: str, research: dict) -> dict:
        """Execute a buy order."""
        # Check if we already hold it
        if self.alpaca.get_position(symbol):
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

        # Calculate position size based on confidence and budget remaining
        current_invested = sum(p["market_value"] for p in positions)
        budget_remaining = MAX_PORTFOLIO_VALUE - current_invested

        if budget_remaining <= 0:
            return {"status": "skipped", "reason": f"Budget exhausted (${MAX_PORTFOLIO_VALUE} deployed)"}

        if VERBOSE:
            log(f"[Drift] Budget: ${MAX_PORTFOLIO_VALUE} | Invested: ${current_invested:.2f} | Remaining: ${budget_remaining:.2f}")

        size = get_position_size(confidence, budget_remaining)

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

            return {
                "status": "executed",
                "action": "buy",
                "symbol": symbol,
                "notional": size,
                "order_id": order.get("id"),
            }

        return {"status": "failed", "reason": "Order submission failed"}

    def _execute_sell(self, symbol: str, thesis: str, confidence: int = 75) -> dict:
        """Execute a sell order."""
        position = self.alpaca.get_position(symbol)
        if not position:
            return {"status": "skipped", "reason": "No position to sell"}

        # Check PDT
        approved, pdt_reason = self.pdt.approve_sell(symbol)
        if not approved:
            if VERBOSE:
                log(f"[Drift] {symbol}: {pdt_reason}")
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

            return {
                "status": "executed",
                "action": "sell",
                "symbol": symbol,
                "qty": position["qty"],
                "pnl": pnl,
                "order_id": order.get("id"),
            }

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
        """Call LLM without tools (for light scan)."""
        if not self.anthropic:
            return "{}"

        try:
            response = self.anthropic.messages.create(
                model=RESEARCH_MODEL,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            log(f"[Drift] LLM error: {e}")
            return "{}"

    def _call_llm_with_tools(self, prompt: str) -> str:
        """
        Call LLM with Anthropic's native WebSearch tool for research.

        Uses server-side web search - the API executes searches automatically.
        """
        if not self.anthropic:
            return "{}"

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
                model=RESEARCH_MODEL,
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
                    model=RESEARCH_MODEL,
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
