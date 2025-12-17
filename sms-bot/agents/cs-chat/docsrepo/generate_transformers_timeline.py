import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# Create figure
fig, ax = plt.subplots(figsize=(18, 14))
ax.set_xlim(2013, 2026)
ax.set_ylim(0, 10)

# Define colors for funding sources
colors = {
    'Government': '#E74C3C',
    'Academic/Corporate Research': '#FF6B6B',
    'Google': '#4285F4',
    'OpenAI': '#10A37F',
    'Microsoft': '#00A4EF',
    'Anthropic': '#CC785C',
    'Amazon': '#FF9900',
    'Multiple': '#FFEAA7'
}

# Timeline events
events = [
    # Phase 0: Government Foundation (shown at top with note)
    {'year': 2013.5, 'what': 'GOVERNMENT FOUNDATION\n35+ years (1980s-2017)', 'who': 'NSF, CIFAR, NSERC, DARPA\nPhD training, basic AI research', 'funder': 'Government', 'y': 9.2},

    # Phase 1: Foundation (2014-2017)
    {'year': 2014, 'what': 'Attention Mechanism\nBahdanau et al.', 'who': 'McGill/Montreal (Bengio)\n*CIFAR-funded lab*', 'funder': 'Government', 'y': 8.5},
    {'year': 2017, 'what': 'Transformer Architecture\n"Attention Is All You Need"', 'who': 'Google Brain (8 authors)\n*NSF-trained PhDs*', 'funder': 'Google', 'y': 8.5},

    # Phase 2: Early Applications (2018-2019)
    {'year': 2018, 'what': 'GPT-1\n117M parameters', 'who': 'OpenAI (Radford et al.)', 'funder': 'OpenAI', 'y': 7},
    {'year': 2018.7, 'what': 'BERT\n340M parameters', 'who': 'Google AI Language', 'funder': 'Google', 'y': 7},
    {'year': 2019, 'what': 'GPT-2\n1.5B parameters', 'who': 'OpenAI', 'funder': 'OpenAI', 'y': 7},
    {'year': 2019.5, 'what': 'Microsoft Investment\n$1B', 'who': 'OpenAI Partnership', 'funder': 'Microsoft', 'y': 7},

    # Phase 3: Scaling Breakthrough (2020-2021)
    {'year': 2020, 'what': 'GPT-3: BREAKTHROUGH\n175B parameters\n$4.6M training cost', 'who': 'OpenAI', 'funder': 'Microsoft', 'y': 5.5},
    {'year': 2020.7, 'what': 'Microsoft Exclusive\nLicense', 'who': 'OpenAI/Microsoft', 'funder': 'Microsoft', 'y': 5.5},
    {'year': 2021, 'what': 'Anthropic Founded\n$124M Series A', 'who': 'Dario & Daniela Amodei\n(ex-OpenAI)', 'funder': 'Anthropic', 'y': 5.5},

    # Phase 4: Commercialization Race (2022-2023)
    {'year': 2022, 'what': 'PaLM\n540B parameters', 'who': 'Google Research', 'funder': 'Google', 'y': 4},
    {'year': 2022.8, 'what': 'ChatGPT Launch\n100M users in 2 months', 'who': 'OpenAI (GPT-3.5)', 'funder': 'Microsoft', 'y': 4},
    {'year': 2023, 'what': 'Microsoft $10B\nInvestment', 'who': 'OpenAI', 'funder': 'Microsoft', 'y': 4},
    {'year': 2023.2, 'what': 'GPT-4\n~1.8T parameters\n$100M+ training', 'who': 'OpenAI', 'funder': 'Microsoft', 'y': 4},
    {'year': 2023.4, 'what': 'Claude 1', 'who': 'Anthropic', 'funder': 'Anthropic', 'y': 4},
    {'year': 2023.6, 'what': 'Google $450M +\nAmazon $4B', 'who': 'Anthropic Funding', 'funder': 'Multiple', 'y': 4},

    # Phase 5: Market Consolidation (2024-2025)
    {'year': 2024, 'what': 'Claude 3 Family\nOpus, Sonnet, Haiku', 'who': 'Anthropic', 'funder': 'Amazon', 'y': 2.5},
    {'year': 2024.3, 'what': 'Gemini Launch\nUltra, Pro, Nano', 'who': 'Google DeepMind', 'funder': 'Google', 'y': 2.5},
    {'year': 2024.6, 'what': 'Claude 3.5 Sonnet', 'who': 'Anthropic', 'funder': 'Multiple', 'y': 2.5},
    {'year': 2025, 'what': 'Anthropic $3.5B\n$61.5B valuation', 'who': 'Series E Round', 'funder': 'Multiple', 'y': 2.5},
    {'year': 2025.3, 'what': 'Claude 4\nOpus 4 & Sonnet 4', 'who': 'Anthropic', 'funder': 'Multiple', 'y': 2.5},
]

# Phase backgrounds
phases = [
    {'start': 2014, 'end': 2017.5, 'name': 'PHASE 1:\nFoundation\n(Academic Research)', 'y': 8, 'color': '#FFE5E5'},
    {'start': 2017.5, 'end': 2020, 'name': 'PHASE 2:\nEarly Applications\n(GPT-1, BERT, GPT-2)', 'y': 6.5, 'color': '#E5F4FF'},
    {'start': 2020, 'end': 2022, 'name': 'PHASE 3:\nScaling Breakthrough\n(GPT-3, Microsoft $1B)', 'y': 5, 'color': '#E5F9F7'},
    {'start': 2022, 'end': 2023.8, 'name': 'PHASE 4:\nCommercialization Race\n(ChatGPT, GPT-4, Claude)', 'y': 3.5, 'color': '#FFF4E5'},
    {'start': 2023.8, 'end': 2025.5, 'name': 'PHASE 5:\nMarket Consolidation\n($60-90B+ invested)', 'y': 2, 'color': '#F0E5FF'},
]

# Draw phase backgrounds
for phase in phases:
    rect = FancyBboxPatch((phase['start'], phase['y']-0.3),
                          phase['end']-phase['start'], 0.6,
                          boxstyle="round,pad=0.05",
                          facecolor=phase['color'],
                          edgecolor='gray',
                          linewidth=1.5,
                          alpha=0.4)
    ax.add_patch(rect)
    ax.text(phase['start'] + (phase['end']-phase['start'])/2, phase['y'],
            phase['name'],
            ha='center', va='center',
            fontsize=8, fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8, edgecolor='gray'))

# Plot events
for event in events:
    color = colors[event['funder']]

    # Event marker
    ax.plot(event['year'], event['y'], 'o', markersize=14, color=color,
            markeredgecolor='black', markeredgewidth=1.5, zorder=5)

    # What happened (bold)
    ax.text(event['year'], event['y'] + 0.4, event['what'],
            ha='center', va='bottom', fontsize=7, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=color, linewidth=2))

    # Who (normal)
    ax.text(event['year'], event['y'] - 0.25, event['who'],
            ha='center', va='top', fontsize=6, style='italic',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='lightyellow', alpha=0.9))

# Draw timeline spine
ax.plot([2014, 2025.5], [1.2, 1.2], 'k-', linewidth=3, zorder=1)

# Year markers
for year in range(2014, 2026, 2):
    ax.plot([year, year], [1.1, 1.3], 'k-', linewidth=2)
    ax.text(year, 0.8, str(year), ha='center', fontsize=11, fontweight='bold')

# Title and labels
ax.text(2019.5, 9.7, 'TRANSFORMERS & LLMs: 8-YEAR REVOLUTION',
        ha='center', fontsize=18, fontweight='bold')
ax.text(2019.5, 9.3, 'From "Attention Is All You Need" to $100B+ Industry',
        ha='center', fontsize=13, style='italic')

# Legend for funding sources
legend_elements = [mpatches.Patch(facecolor=colors[key], edgecolor='black', label=key)
                   for key in colors.keys()]
ax.legend(handles=legend_elements, loc='upper left', fontsize=9, title='Funding Source',
          ncol=2, framealpha=0.9)

# Investment summary box
summary_text = '''TOTAL INVESTMENT: $62-94 BILLION (1980s-2025)

GOVERNMENT (1980s-2017):               $2-4B
  - NSF/DARPA grants, PhD fellowships
  - CIFAR (Canada), NSERC, EU councils
  - Trained Hinton, Bengio, LeCun + 1000s PhDs

CORPORATE (2017-2025):                 $60-90B
  - OpenAI + Microsoft:                ~$13B
  - Anthropic (Google/Amazon):         ~$10B
  - Google Internal AI:                ~$20-30B
  - Meta, Others:                      ~$15-30B

FULL TIMELINE: 40+ years (like AVs!)
  But govt funding was INDIRECT & HIDDEN

VISIBLE timeline: Only 8 years (2017-2025)'''

ax.text(2025.8, 0.5, summary_text,
        ha='left', va='bottom', fontsize=7,
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF9E6', edgecolor='black', linewidth=2),
        family='monospace')

# Key milestones callout
milestones_text = '''KEY INSIGHT:

HIDDEN 35-year government foundation:
  - 1980s-2010s: NSF/DARPA/CIFAR
  - Trained "godfathers" (Hinton/
    Bengio/LeCun) + thousands of PhDs
  - $2-4B investment

VISIBLE 8-year corporate boom:
  - 2017: Transformer (Google Brain)
  - 2020: GPT-3 (OpenAI + Microsoft)
  - 2022: ChatGPT (100M users)
  - 2025: $60-90B corporate investment

SAME 40-year timeline as AVs,
but govt role is INVISIBLE!'''

ax.text(2013.2, 5, milestones_text,
        ha='left', va='center', fontsize=7,
        bbox=dict(boxstyle='round,pad=0.4', facecolor='#E8F4F8', edgecolor='#4285F4', linewidth=2),
        family='monospace')

# Remove axes
ax.set_xticks([])
ax.set_yticks([])
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['bottom'].set_visible(False)
ax.spines['left'].set_visible(False)

plt.tight_layout()
plt.savefig('transformers-timeline.png', dpi=300, bbox_inches='tight', facecolor='white')
print("Timeline saved as 'transformers-timeline.png'")
plt.show()
