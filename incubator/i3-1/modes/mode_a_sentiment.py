"""
i3-1 Trading Agent - Mode A: Sentiment

Uses the existing crypto-research agent's daily reports to make trading decisions.
Parses sentiment, price action, and risk factors from the report.

This mode leverages existing infrastructure instead of duplicating research.
"""

import os
import re
import json
from typing import Optional

from modes.base import TradingMode, TradeDecision, Signal


class SentimentMode(TradingMode):
    """
    Sentiment-based trading using crypto-research reports.

    Flow:
    1. Read latest crypto-research report (from file or Supabase)
    2. Parse: sentiment, price action, risk factors
    3. LLM decides: given report + current positions → BUY/SELL/HOLD
    """

    name = "Sentiment"
    description = "Uses crypto-research reports for trading decisions"
    mode_id = "A"

    def __init__(self):
        self._last_report: Optional[str] = None
        self._last_report_date: Optional[str] = None

    def get_data_sources(self) -> list[str]:
        return ["crypto-research daily report", "current positions"]

    async def analyze(self, asset: str, positions: list[dict], cash: float) -> TradeDecision:
        """
        Analyze an asset using the crypto-research report.

        For MVP, we parse the report manually. Later, we can use LLM for deeper analysis.
        """
        # Load the latest report
        report = await self._load_latest_report()

        if not report:
            return TradeDecision(
                signal="HOLD",
                asset=asset,
                reasoning="No crypto-research report available. Holding until data available.",
                confidence=0,
                data_sources=["none"],
            )

        # Parse sentiment from report
        sentiment = self._parse_sentiment(report)
        price_info = self._parse_price_action(report, asset)
        risk_factors = self._parse_risk_factors(report)

        # Check if we already have a position
        current_position = self._find_position(asset, positions)
        has_position = current_position is not None

        # Make decision based on sentiment
        signal, reasoning, confidence = self._decide(
            asset=asset,
            sentiment=sentiment,
            price_info=price_info,
            risk_factors=risk_factors,
            has_position=has_position,
            current_position=current_position,
            cash=cash,
        )

        return TradeDecision(
            signal=signal,
            asset=asset,
            reasoning=reasoning,
            confidence=confidence,
            data_sources=["crypto-research report", f"sentiment: {sentiment}"],
        )

    async def _load_latest_report(self) -> Optional[str]:
        """
        Load the latest crypto-research report.

        First tries local file, then could be extended to query Supabase.
        """
        # Try to find local reports
        report_dirs = [
            "/Users/bart/Documents/code/vibeceo/sms-bot/data/crypto-reports",
            os.path.expanduser("~/data/crypto-reports"),
        ]

        for report_dir in report_dirs:
            if os.path.exists(report_dir):
                # Find most recent report
                files = sorted(
                    [f for f in os.listdir(report_dir) if f.endswith(".md")],
                    reverse=True,
                )
                if files:
                    report_path = os.path.join(report_dir, files[0])
                    with open(report_path, "r") as f:
                        self._last_report = f.read()
                        self._last_report_date = files[0].replace("crypto_research_", "").replace(".md", "")
                        return self._last_report

        # TODO: Query Supabase for latest report if local not found
        # This would use the getLatestStoredCryptoReport pattern

        return None

    def _parse_sentiment(self, report: str) -> str:
        """Extract sentiment from report (Bullish/Bearish/Neutral)."""
        # Look for "Overall Sentiment:" line - capture the full phrase
        match = re.search(r"\*\*Overall Sentiment:\*\*\s*(.+?)(?:\n|$)", report, re.IGNORECASE)
        if match:
            sentiment_text = match.group(1).lower()
            # Check for bullish/bearish anywhere in the phrase
            # "Cautiously Bullish with Extreme Fear" should still be bullish
            if "bullish" in sentiment_text:
                return "bullish"
            elif "bearish" in sentiment_text:
                return "bearish"
        return "neutral"

    def _parse_price_action(self, report: str, asset: str) -> dict:
        """Extract price action for a specific asset."""
        info = {
            "current_price": None,
            "change_24h": None,
            "change_pct": None,
        }

        # Determine which section to look for
        asset_name = "Bitcoin" if "BTC" in asset.upper() else "Ethereum"

        # Find the relevant section
        section_match = re.search(
            rf"##\s*{asset_name}.*?(?=##|\Z)",
            report,
            re.IGNORECASE | re.DOTALL,
        )

        if section_match:
            section = section_match.group(0)

            # Extract price
            price_match = re.search(r"Current Price:\s*\$?([\d,]+(?:\.\d+)?)", section)
            if price_match:
                info["current_price"] = float(price_match.group(1).replace(",", ""))

            # Extract 24h change
            change_match = re.search(r"24h Change:\s*([+-]?[\d.]+)%", section)
            if change_match:
                info["change_pct"] = float(change_match.group(1))

        return info

    def _parse_risk_factors(self, report: str) -> list[str]:
        """Extract risk factors from report."""
        risks = []

        # Find risk section
        risk_match = re.search(
            r"##\s*Risk Factors.*?(?=##|\Z)",
            report,
            re.IGNORECASE | re.DOTALL,
        )

        if risk_match:
            section = risk_match.group(0)
            # Extract bullet points
            bullets = re.findall(r"[-*]\s*(.+)", section)
            risks = [b.strip() for b in bullets[:5]]  # Limit to 5

        return risks

    def _find_position(self, asset: str, positions: list[dict]) -> Optional[dict]:
        """Find current position for an asset."""
        # Normalize asset symbol
        normalized = asset.replace("/USD", "USD").replace("/", "")

        for pos in positions:
            if pos["symbol"].upper() == normalized.upper():
                return pos

        return None

    def _decide(
        self,
        asset: str,
        sentiment: str,
        price_info: dict,
        risk_factors: list[str],
        has_position: bool,
        current_position: Optional[dict],
        cash: float,
    ) -> tuple[Signal, str, int]:
        """
        Make trading decision based on parsed data.

        Simple rules for MVP:
        - Bullish + no position → BUY
        - Bearish + has position → SELL
        - High risk factors → reduce confidence
        """
        reasoning_parts = []
        confidence = 50  # Base confidence

        # Sentiment analysis
        if sentiment == "bullish":
            reasoning_parts.append(f"Market sentiment is BULLISH.")
            confidence += 20
            base_signal = "BUY" if not has_position else "HOLD"
        elif sentiment == "bearish":
            reasoning_parts.append(f"Market sentiment is BEARISH.")
            confidence += 20
            base_signal = "SELL" if has_position else "HOLD"
        else:
            reasoning_parts.append(f"Market sentiment is NEUTRAL.")
            base_signal = "HOLD"

        # Price action
        if price_info.get("change_pct"):
            change = price_info["change_pct"]
            if change > 5:
                reasoning_parts.append(f"Price up {change:.1f}% in 24h (strong momentum).")
                confidence += 10
            elif change < -5:
                reasoning_parts.append(f"Price down {change:.1f}% in 24h (selling pressure).")
                confidence += 10
            else:
                reasoning_parts.append(f"Price change {change:+.1f}% in 24h (moderate).")

        # Risk factors
        if risk_factors:
            reasoning_parts.append(f"Risk factors: {len(risk_factors)} identified.")
            confidence -= len(risk_factors) * 5  # Each risk reduces confidence

        # Position check
        if has_position and base_signal == "BUY":
            reasoning_parts.append(f"Already have position in {asset}, holding.")
            base_signal = "HOLD"

        if not has_position and base_signal == "SELL":
            reasoning_parts.append(f"No position in {asset} to sell, holding.")
            base_signal = "HOLD"

        # Cash check for buys
        if base_signal == "BUY" and cash < 100:
            reasoning_parts.append(f"Insufficient cash (${cash:.2f}), holding.")
            base_signal = "HOLD"
            confidence = 0

        # Clamp confidence
        confidence = max(0, min(100, confidence))

        reasoning = " ".join(reasoning_parts)
        return base_signal, reasoning, confidence
