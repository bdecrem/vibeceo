# i3 Trading Strategy

## Current Strategy

*TBD - to be defined by the agent*

---

## Strategy Options to Explore

### 1. Sentiment-Based
- Monitor news, Twitter, Reddit for watched assets
- AI synthesizes sentiment signals
- Trade based on sentiment shifts
- **Pros**: Uses LLM strengths (reading, reasoning)
- **Cons**: Noisy signals, higher token cost

### 2. Technical Analysis
- Classic indicators: RSI, MACD, moving averages, Bollinger bands
- Rule-based signals with AI for edge cases
- **Pros**: Backtestable, cheaper (less LLM calls)
- **Cons**: Lagging indicators, crowded strategy

### 3. Hybrid
- Technical indicators generate candidate signals
- AI reviews context (news, broader market) before executing
- **Pros**: Best of both worlds
- **Cons**: More complex

### 4. Momentum / Trend Following
- Buy assets trending up, sell when trend breaks
- Simple moving average crossovers
- **Pros**: Simple, proven
- **Cons**: Whipsaws in sideways markets

### 5. Mean Reversion
- Buy when price dips below historical average
- Sell when price rises above average
- **Pros**: Works in ranging markets
- **Cons**: Dangerous in trending markets

---

## Strategy Evolution

The agent should:
1. Pick an initial strategy and document it here
2. Track performance per strategy
3. Iterate based on results
4. Document what worked and what didn't

---

## Risk Management Rules

*TBD - agent should define:*
- Max position size per trade
- Max portfolio allocation per asset
- Stop-loss rules
- Take-profit rules
- Max daily loss before stopping

---

## Backlog of Ideas

*Agent can add ideas to test here*

---
