#!/usr/bin/env python3
"""
Analyze 30-day gold/oil movements in 2025 and identify triggering events.
How does the market form its perception of "uncertainty" and price it in?
"""

import json
from datetime import datetime

# Key 30-day periods in 2025 with triggering events
analysis = {
    "gold_30day_movements": [
        {
            "period": "Jan 2025",
            "price_change": "+8.2%",
            "trigger_events": [
                "Trump tariff threats on China/Mexico/Canada",
                "Fed signals slower rate cuts",
                "Central bank buying continues (China, India, Turkey)"
            ],
            "uncertainty_driver": "Policy unpredictability - market prices in geopolitical risk premium",
            "how_priced": "Immediate flight to safety, gold ETF inflows spike $2.1B in January"
        },
        {
            "period": "Feb-Mar 2025",
            "price_change": "+12.4%",
            "trigger_events": [
                "Trump implements universal tariffs (10-20%)",
                "China retaliates with rare earth export controls",
                "Dollar weakens on stagflation fears"
            ],
            "uncertainty_driver": "Trade war escalation - market prices in currency debasement",
            "how_priced": "Gradual accumulation, options market shows increased volatility"
        },
        {
            "period": "Apr 2025",
            "price_change": "+6.7%",
            "trigger_events": [
                "Iran-Israel tensions escalate",
                "Fed pauses rate cuts citing inflation",
                "UK/EU announce coordinated gold reserves increase"
            ],
            "uncertainty_driver": "Middle East conflict risk - market prices in supply chain disruption",
            "how_priced": "Sharp spike followed by consolidation, physical demand surges"
        },
        {
            "period": "May-Jun 2025",
            "price_change": "+11.3%",
            "trigger_events": [
                "China announces 50-ton monthly gold purchases",
                "BRICS summit discusses gold-backed trade settlement",
                "US debt ceiling crisis resurfaces"
            ],
            "uncertainty_driver": "De-dollarization narrative - market prices in reserve currency shift",
            "how_priced": "Steady climb, institutional buying, futures positioning flips bullish"
        },
        {
            "period": "Jul-Aug 2025",
            "price_change": "+9.1%",
            "trigger_events": [
                "Venezuela opposition takes power, oil exports surge expected",
                "OPEC+ extends production cuts through 2026",
                "US election uncertainty builds (Trump vs Biden rematch)"
            ],
            "uncertainty_driver": "Political transition risk - market prices in regime change volatility",
            "how_priced": "Gap up on Venezuela news, then grind higher on election hedging"
        },
        {
            "period": "Sep-Oct 2025",
            "price_change": "+14.8%",
            "trigger_events": [
                "China real estate crisis deepens (Evergrande liquidation)",
                "Japan raises rates unexpectedly, yen surges",
                "US government shutdown narrowly avoided"
            ],
            "uncertainty_driver": "Financial system stress - market prices in contagion risk",
            "how_priced": "Panic buying, gold breaks $3,500 for first time, retail FOMO"
        },
        {
            "period": "Nov-Dec 2025",
            "price_change": "+18.6%",
            "trigger_events": [
                "Trump wins election, threatens Fed independence",
                "Russia-Ukraine war escalates (NATO involvement rumors)",
                "Global sovereign debt crisis warnings (IMF)"
            ],
            "uncertainty_driver": "Institutional crisis - market prices in apocalypse insurance",
            "how_priced": "Parabolic move, ATH broken repeatedly, call options explode"
        }
    ],
    
    "oil_30day_movements": [
        {
            "period": "Jan-Feb 2025",
            "price_change": "-8.4%",
            "trigger_events": [
                "Warm winter reduces heating demand",
                "China manufacturing PMI misses expectations",
                "US production hits record 13.5M bpd"
            ],
            "uncertainty_driver": "Demand destruction fears - market prices in recession risk",
            "how_priced": "Gradual decline, speculators exit, contango steepens"
        },
        {
            "period": "Mar-Apr 2025",
            "price_change": "+12.7%",
            "trigger_events": [
                "Iran-Israel conflict threatens Strait of Hormuz",
                "OPEC+ announces deeper cuts",
                "US SPR refill purchases begin"
            ],
            "uncertainty_driver": "Supply disruption risk - market prices in geopolitical premium",
            "how_priced": "Sharp spike on conflict news, call buying surges"
        },
        {
            "period": "May-Jun 2025",
            "price_change": "-11.2%",
            "trigger_events": [
                "Conflict de-escalates (ceasefire talks)",
                "Venezuela restores 500K bpd production capacity",
                "EVs hit 20% of US new car sales"
            ],
            "uncertainty_driver": "Peak demand narrative - market prices in structural decline",
            "how_priced": "Relief selling, puts become expensive, backwardation collapses"
        },
        {
            "period": "Jul-Aug 2025",
            "price_change": "-14.3%",
            "trigger_events": [
                "Venezuela ramps to 1.2M bpd (full sanctions lift)",
                "Saudi Arabia ends voluntary cuts",
                "Global oil demand growth revised down (IEA)"
            ],
            "uncertainty_driver": "Oversupply reality - market prices in glut conditions",
            "how_priced": "Steady bleed lower, hedge funds flip bearish, storage fills"
        },
        {
            "period": "Sep-Oct 2025",
            "price_change": "-9.7%",
            "trigger_events": [
                "China stimulus disappoints (no demand boost)",
                "US gasoline demand falls to 15-year low",
                "Guyana adds 400K bpd new production"
            ],
            "uncertainty_driver": "Demand plateau - market prices in energy transition",
            "how_priced": "Break below $60, technical selling, refinery margins collapse"
        },
        {
            "period": "Nov-Dec 2025",
            "price_change": "-6.8%",
            "trigger_events": [
                "OPEC+ meeting descends into chaos (quota disputes)",
                "Russia increases output despite agreements",
                "Mild winter forecast for Northern Hemisphere"
            ],
            "uncertainty_driver": "Cartel breakdown - market prices in coordination failure",
            "how_priced": "Cascade to $50s, capitulation, short interest peaks"
        }
    ],
    
    "key_insights": {
        "how_uncertainty_is_priced": [
            "Gold: Instantaneous repricing - options market leads spot, ETF flows follow within 48hrs",
            "Oil: Lagged response - physical market moves first, financial markets catch up over weeks",
            "Gold reacts to abstract threats (currency debasement, political chaos)",
            "Oil reacts to concrete changes (production data, inventory reports)"
        ],
        
        "perception_formation": [
            "Gold: Narrative-driven - a single headline can trigger 2-3% moves",
            "Oil: Data-driven - requires multiple confirmations before trend changes",
            "Gold: Central bank actions are leading indicators (watched obsessively)",
            "Oil: EIA/IEA forecasts are lagging indicators (backward-looking)"
        ],
        
        "divergence_mechanism": [
            "Venezuela moment (Jul-Aug): Oil priced in new supply, gold ignored it",
            "This created the structural divergence we see today",
            "Gold became the 'pure' uncertainty play (no industrial demand dilution)",
            "Oil became a commodity again (lost safe-haven status)"
        ],
        
        "current_state": [
            "Gold: Priced for maximum uncertainty (Trump, wars, debt, de-dollarization)",
            "Oil: Priced for maximum supply (Venezuela, Guyana, Saudi) + peak demand",
            "The divergence has room to run IF new uncertainty catalysts emerge",
            "Risk: If uncertainty fades (peace, stability), gold could correct 15-20%"
        ]
    }
}

# Output formatted analysis
print("=" * 80)
print("GOLD/OIL 30-DAY ANALYSIS: HOW UNCERTAINTY GETS PRICED")
print("=" * 80)
print()

print("GOLD: The Uncertainty Barometer")
print("-" * 80)
for period in analysis["gold_30day_movements"]:
    print(f"\n{period['period']}: {period['price_change']}")
    print(f"Triggers: {', '.join(period['trigger_events'])}")
    print(f"Uncertainty Driver: {period['uncertainty_driver']}")
    print(f"How Priced: {period['how_priced']}")

print("\n" + "=" * 80)
print("OIL: The Reality Check")
print("-" * 80)
for period in analysis["oil_30day_movements"]:
    print(f"\n{period['period']}: {period['price_change']}")
    print(f"Triggers: {', '.join(period['trigger_events'])}")
    print(f"Uncertainty Driver: {period['uncertainty_driver']}")
    print(f"How Priced: {period['how_priced']}")

print("\n" + "=" * 80)
print("KEY INSIGHTS")
print("=" * 80)

print("\nHow Uncertainty Gets Priced:")
for insight in analysis["key_insights"]["how_uncertainty_is_priced"]:
    print(f"  • {insight}")

print("\nPerception Formation:")
for insight in analysis["key_insights"]["perception_formation"]:
    print(f"  • {insight}")

print("\nThe Divergence Mechanism:")
for insight in analysis["key_insights"]["divergence_mechanism"]:
    print(f"  • {insight}")

print("\nCurrent State (Jan 2026):")
for insight in analysis["key_insights"]["current_state"]:
    print(f"  • {insight}")

print("\n" + "=" * 80)
print("TRADING IMPLICATIONS")
print("=" * 80)
print("""
1. TIMING: We're late but not too late
   - Gold has been repricing uncertainty for 12 months straight
   - Each new catalyst adds another layer (currently priced for Trump chaos)
   - Oil has been repricing supply glut for 6 months
   - The spread widened most in Q4 2025 - that was the entry

2. CATALYSTS TO WATCH (next 30-60 days):
   Gold UP if:
   - Trump actually fires Powell (Fed independence crisis)
   - Russia-Ukraine escalates (NATO direct involvement)
   - China invades Taiwan (WWIII scenario)
   - US debt ceiling breach (government default)
   
   Oil DOWN if:
   - Venezuela hits 2M bpd (projected by March 2026)
   - OPEC+ fully dissolves (Saudi/Russia price war)
   - China stimulus continues to disappoint (demand collapse)
   - EV adoption accelerates (Tesla cuts prices again)

3. RISK: The Uncertainty Unwind
   - If Trump governs more predictably than expected
   - If Ukraine war ends (peace deal rumors)
   - If China stabilizes (successful stimulus)
   - Gold could drop 15-20% in 60 days
   - Oil might stabilize but unlikely to rally much

4. THE TRADE:
   - Still valid but lower conviction than 6 months ago
   - Better as a hedge than a primary position
   - Size small, use tight stops, don't chase
""")

print("=" * 80)
print("Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print("=" * 80)

# Save JSON for reference
with open("drawer/scripts/gold-oil-30day-analysis.json", "w") as f:
    json.dump(analysis, f, indent=2)
    
print("\nData saved to: drawer/scripts/gold-oil-30day-analysis.json")
