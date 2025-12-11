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
    MAX_POSITIONS,
    MAX_PORTFOLIO_VALUE,
    MIN_CONFIDENCE_TO_TRADE,
    SCAN_INTERVAL_MINUTES,
    RESEARCH_MODEL,
    MAX_RESEARCH_SEARCHES,
    VERBOSE,
    get_position_size,
    print_config,
)
from trading.alpaca_client import AlpacaClient, is_market_open, get_market_status
from utils.pdt_tracker import PDTTracker
from utils.journal import TradeJournal

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

        if VERBOSE:
            print_config()

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
            active_watchlist = WATCHLIST
            mode = "stocks"

            # During market hours, check if we should seek deployment
            positions = self.alpaca.get_positions()
            current_invested = sum(p["market_value"] for p in positions)
            budget_remaining = MAX_PORTFOLIO_VALUE - current_invested
            seek_deployment = budget_remaining > MAX_PORTFOLIO_VALUE * 0.5  # Seek if >50% budget available

        if VERBOSE:
            print(f"[Drift] Scanning {mode}: {len(active_watchlist)} assets")
            if seek_deployment:
                print(f"[Drift] Cash >50% of budget - actively seeking entry opportunities")

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
        Light scan of portfolio and watchlist.

        Quick check to identify what needs attention.

        Args:
            watchlist: List of symbols to scan. Defaults to WATCHLIST.
            seek_deployment: If True, actively look for entry opportunities (stocks only, during market hours)
        """
        if watchlist is None:
            watchlist = WATCHLIST

        try:
            # Get current state
            account = self.alpaca.get_account()
            positions = self.alpaca.get_positions()
            pdt_status = self.pdt.get_status()

            # Filter positions to only those in our active watchlist
            # (so crypto scan only sees crypto positions, stock scan only sees stock positions)
            watchlist_set = set(watchlist)
            relevant_positions = [p for p in positions if p["symbol"] in watchlist_set]

            # Get prices for watchlist (minus what we already hold)
            held_symbols = [p["symbol"] for p in relevant_positions]
            watchlist_to_check = [s for s in watchlist if s not in held_symbols]

            # Build context for LLM
            context = self._build_scan_context(account, positions, pdt_status)

            # Check market regime (SPY as proxy) if seeking deployment
            market_context = ""
            if seek_deployment:
                spy_price = self.alpaca.get_latest_price("SPY")
                # Get SPY's recent performance from bars
                spy_bars = self.alpaca.get_bars("SPY", days=5)
                if spy_bars and len(spy_bars) >= 2:
                    prev_close = spy_bars[-2]["close"]
                    today_change = (spy_price - prev_close) / prev_close * 100 if spy_price else 0
                    market_context = f"\n\nMARKET REGIME:\nSPY today: {today_change:+.2f}%"
                    if today_change < -2:
                        market_context += " (CAUTION: Market down significantly - research WHY before deploying)"
                    elif today_change > 2:
                        market_context += " (Market strong)"
                    else:
                        market_context += " (Market stable)"

            # Get news for held positions
            if positions:
                news = self.alpaca.get_news([p["symbol"] for p in positions], limit=5)
                context += f"\n\nRecent news:\n"
                for item in news[:5]:
                    context += f"- {item['headline']} ({', '.join(item['symbols'])})\n"

            # Build different prompts based on mode
            if seek_deployment:
                deployment_instruction = f"""
DEPLOYMENT MODE: You have cash to deploy (>50% of budget in cash).
Available to buy: {', '.join(watchlist_to_check[:15])}
{market_context}

Look for 1-2 stocks that might be good entry opportunities RIGHT NOW.
Consider: recent pullbacks in strong stocks, positive momentum, good risk/reward setups.
If the market is down big, be extra cautious - flag for research but note the risk."""
            else:
                deployment_instruction = ""

            # Ask LLM to scan
            scan_prompt = f"""You are Drift, a curious skeptic swing trader. Do a quick scan.

CURRENT STATE:
{context}
{deployment_instruction}

TASK: Quick scan (30 seconds). Identify anything that needs deeper research:
- Positions with big moves (>3% either direction)
- Positions with relevant news
- Watchlist stocks with unusual moves
{f"- Entry opportunities (you have cash to deploy)" if seek_deployment else ""}

Respond in JSON:
{{
    "summary": "One line summary of portfolio state",
    "triggers": [
        {{"symbol": "AAPL", "reason": "Down 4%, news about..."}},
        ...
    ],
    "all_stable": true/false
}}

{"If nothing needs attention AND no good entry opportunities, return empty triggers list." if seek_deployment else "If nothing needs attention, return empty triggers list."}
Be selective - only flag things worth researching."""

            response = self._call_llm(scan_prompt, max_tokens=500)

            # Parse response
            try:
                # Extract JSON from response
                result = self._extract_json(response)
            except Exception:
                result = {
                    "summary": "Scan completed",
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

            return result

        except Exception as e:
            self.journal.log_error("light_scan", str(e))
            return {"summary": f"Scan error: {e}", "triggers": [], "all_stable": True}

    def _research(self, trigger: dict) -> dict:
        """
        Deep research on a triggered symbol.

        This is where we go agentic - using WebSearch to investigate.
        """
        symbol = trigger.get("symbol", "")
        reason = trigger.get("reason", "")

        if VERBOSE:
            print(f"\n[Drift] Researching {symbol}: {reason}")

        # Get current position info if we hold it
        position = self.alpaca.get_position(symbol)
        is_entry = position is None

        # Build research prompt
        research_prompt = f"""You are Drift, a curious skeptic swing trader researching {symbol}.

TRIGGER: {reason}

{"CURRENT POSITION:" if position else "POTENTIAL ENTRY:"}
{json.dumps(position, indent=2) if position else "No position - considering entry"}

PDT STATUS: {self.pdt.get_day_trades_remaining()} day trades remaining this week

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
            print(f"[Drift] {symbol}: {result.get('decision', 'pass').upper()} "
                  f"(confidence: {result.get('confidence', 0)}%)")
            print(f"        Thesis: {result.get('thesis', '')[:100]}...")

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
                print(f"[Drift] {symbol}: Confidence {confidence}% below threshold, skipping")
            return {"status": "skipped", "reason": "Low confidence"}

        if decision == "buy":
            return self._execute_buy(symbol, confidence, thesis, research)
        elif decision == "sell":
            return self._execute_sell(symbol, thesis)
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

        # Calculate position size based on confidence and budget remaining
        current_invested = sum(p["market_value"] for p in positions)
        budget_remaining = MAX_PORTFOLIO_VALUE - current_invested

        if budget_remaining <= 0:
            return {"status": "skipped", "reason": f"Budget exhausted (${MAX_PORTFOLIO_VALUE} deployed)"}

        if VERBOSE:
            print(f"[Drift] Budget: ${MAX_PORTFOLIO_VALUE} | Invested: ${current_invested:.2f} | Remaining: ${budget_remaining:.2f}")

        size = get_position_size(confidence, budget_remaining)

        if size <= 0:
            return {"status": "skipped", "reason": "Insufficient funds or confidence"}

        # Get current price for stop/target calculation
        price = self.alpaca.get_latest_price(symbol)
        stop_loss_pct = research.get("stop_loss_pct", 5)
        target_pct = research.get("target_pct", 8)

        stop_loss = price * (1 - stop_loss_pct / 100) if price else None
        target = price * (1 + target_pct / 100) if price else None

        # Execute
        order = self.alpaca.buy(symbol, size, reason=thesis[:100])

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

            return {
                "status": "executed",
                "action": "buy",
                "symbol": symbol,
                "notional": size,
                "order_id": order.get("id"),
            }

        return {"status": "failed", "reason": "Order submission failed"}

    def _execute_sell(self, symbol: str, thesis: str) -> dict:
        """Execute a sell order."""
        position = self.alpaca.get_position(symbol)
        if not position:
            return {"status": "skipped", "reason": "No position to sell"}

        # Check PDT
        approved, pdt_reason = self.pdt.approve_sell(symbol)
        if not approved:
            if VERBOSE:
                print(f"[Drift] {symbol}: {pdt_reason}")
            return {"status": "blocked", "reason": pdt_reason}

        # Check if it's a day trade
        is_day_trade = self.pdt.would_be_day_trade(symbol)

        # Execute
        order = self.alpaca.sell(symbol, reason=thesis[:100])

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
            print(f"[Drift] LLM error: {e}")
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
                        print(f"[Drift] Web searches performed: {searches}")

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
            print(f"[Drift] Research error: {e}")
            return "{}"

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from LLM response."""
        # Try to find JSON in the response
        import re

        # Look for JSON block
        json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Try the whole text
        try:
            return json.loads(text)
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

    agent = DriftAgent(paper=True)

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
