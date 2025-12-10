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
    MAX_POSITIONS,
    MIN_CONFIDENCE_TO_TRADE,
    SCAN_INTERVAL_MINUTES,
    RESEARCH_MODEL,
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

    def run_cycle(self) -> dict:
        """
        Run one trading cycle.

        Returns dict with cycle results.
        """
        cycle_start = datetime.now()

        # Check if market is open
        market = get_market_status()
        if not market["is_open"]:
            return {
                "status": "market_closed",
                "message": f"Market closed. Time: {market['current_time_et']}",
                "actions": [],
            }

        # Step 1: Light scan
        scan_result = self._light_scan()

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

    def _light_scan(self) -> dict:
        """
        Light scan of portfolio and watchlist.

        Quick check to identify what needs attention.
        """
        try:
            # Get current state
            account = self.alpaca.get_account()
            positions = self.alpaca.get_positions()
            pdt_status = self.pdt.get_status()

            # Get prices for watchlist (minus what we already hold)
            held_symbols = [p["symbol"] for p in positions]
            watchlist_to_check = [s for s in WATCHLIST if s not in held_symbols]

            # Build context for LLM
            context = self._build_scan_context(account, positions, pdt_status)

            # Get news for held positions
            if positions:
                news = self.alpaca.get_news([p["symbol"] for p in positions], limit=5)
                context += f"\n\nRecent news:\n"
                for item in news[:5]:
                    context += f"- {item['headline']} ({', '.join(item['symbols'])})\n"

            # Ask LLM to scan
            scan_prompt = f"""You are Drift, a curious skeptic swing trader. Do a quick scan.

CURRENT STATE:
{context}

TASK: Quick scan (30 seconds). Identify anything that needs deeper research:
- Positions with big moves (>3% either direction)
- Positions with relevant news
- Watchlist stocks with unusual moves
- Anything else notable

Respond in JSON:
{{
    "summary": "One line summary of portfolio state",
    "triggers": [
        {{"symbol": "AAPL", "reason": "Down 4%, news about..."}},
        ...
    ],
    "all_stable": true/false
}}

If nothing needs attention, return empty triggers list.
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

        # Calculate position size
        cash = self.alpaca.get_cash()
        size = get_position_size(confidence, cash)

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
        Call LLM with WebSearch tool for research.

        This is where we go agentic.
        """
        if not self.anthropic:
            return "{}"

        # Define web search tool
        tools = [
            {
                "name": "web_search",
                "description": "Search the web for current information about stocks, news, and market sentiment.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query",
                        },
                    },
                    "required": ["query"],
                },
            },
        ]

        messages = [{"role": "user", "content": prompt}]
        searches_performed = []

        # Agentic loop - let LLM use tools
        max_iterations = 6  # Cap iterations
        for _ in range(max_iterations):
            try:
                response = self.anthropic.messages.create(
                    model=RESEARCH_MODEL,
                    max_tokens=2000,
                    tools=tools,
                    messages=messages,
                )

                # Check if we need to handle tool use
                if response.stop_reason == "tool_use":
                    # Find tool use block
                    tool_use = None
                    text_content = ""

                    for block in response.content:
                        if block.type == "tool_use":
                            tool_use = block
                        elif block.type == "text":
                            text_content += block.text

                    if tool_use and tool_use.name == "web_search":
                        query = tool_use.input.get("query", "")
                        searches_performed.append(query)

                        if VERBOSE:
                            print(f"[Drift] WebSearch: {query}")

                        # Execute search (using Anthropic's built-in or our own)
                        search_result = self._execute_web_search(query)

                        # Add assistant message and tool result
                        messages.append({"role": "assistant", "content": response.content})
                        messages.append({
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tool_use.id,
                                    "content": search_result,
                                }
                            ],
                        })
                        continue

                # No more tool use, get final response
                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text

                return final_text

            except Exception as e:
                print(f"[Drift] Research error: {e}")
                return "{}"

        return "{}"

    def _execute_web_search(self, query: str) -> str:
        """
        Execute a web search.

        Uses Anthropic's web search if available, or returns placeholder.
        """
        # For now, return a placeholder - in production, integrate with actual search
        # The claude-agent-sdk would handle this automatically
        return f"Search results for '{query}': [Simulated - integrate real search API]"

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
