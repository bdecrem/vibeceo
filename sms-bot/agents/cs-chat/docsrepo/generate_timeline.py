import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# Create figure
fig, ax = plt.subplots(figsize=(16, 12))
ax.set_xlim(1980, 2028)
ax.set_ylim(0, 10)

# Define colors for funding sources
colors = {
    'DARPA': '#FF6B6B',
    'Google': '#4ECDC4',
    'Alphabet': '#45B7D1',
    'External VC': '#96CEB4',
    'Hybrid': '#FFEAA7',
    'Revenue': '#55E6C1'
}

# Timeline events
events = [
    # Phase 1: Government Research (1984-2004)
    {'year': 1984, 'what': 'Navlab Project Begins', 'who': 'CMU Robotics Institute', 'funder': 'DARPA', 'y': 8},
    {'year': 1986, 'what': 'Navlab 1 (First Van)', 'who': 'CMU - Chevy Van', 'funder': 'DARPA', 'y': 8},
    {'year': 1988, 'what': 'ALVINN Neural Network', 'who': 'CMU - Dean Pomerleau', 'funder': 'DARPA', 'y': 8},
    {'year': 1995, 'what': 'No Hands Across America\n2,850 miles autonomous', 'who': 'CMU Navlab 5', 'funder': 'DARPA', 'y': 8},

    # Phase 2: DARPA Challenges (2004-2007)
    {'year': 2004, 'what': 'Grand Challenge I\nNo Finishers', 'who': '195 Teams, CMU Furthest', 'funder': 'DARPA', 'y': 6.5},
    {'year': 2005, 'what': 'Grand Challenge II\nSTANLEY WINS!', 'who': 'Stanford (Sebastian Thrun)', 'funder': 'DARPA', 'y': 6.5},
    {'year': 2007, 'what': 'Urban Challenge\nBOSS WINS!', 'who': 'CMU + GM Partnership', 'funder': 'DARPA', 'y': 6.5},

    # Phase 3: Google R&D (2009-2016)
    {'year': 2009, 'what': 'Project Chauffeur Begins', 'who': 'Google X (Thrun + 15 engineers)', 'funder': 'Google', 'y': 5},
    {'year': 2010, 'what': 'Public Reveal', 'who': 'Google X', 'funder': 'Google', 'y': 5},

    # Phase 4: Waymo (2016-2025)
    {'year': 2016, 'what': 'Waymo Spinoff', 'who': 'Alphabet Subsidiary', 'funder': 'Alphabet', 'y': 3.5},
    {'year': 2020, 'what': 'First Driverless Service\n+ Series A: $3.2B', 'who': 'Waymo One (Phoenix)', 'funder': 'Hybrid', 'y': 3.5},
    {'year': 2021, 'what': 'Series B: $2.5B', 'who': 'Waymo', 'funder': 'Hybrid', 'y': 3.5},
    {'year': 2024, 'what': 'Series C: $5.6B\n$45B Valuation\n4M Paid Trips', 'who': 'Waymo (4 cities, 2K cars)', 'funder': 'Hybrid', 'y': 3.5},
    {'year': 2025, 'what': '10M Trips\n$125M Revenue', 'who': 'Waymo', 'funder': 'Revenue', 'y': 3.5},
]

# Phase backgrounds
phases = [
    {'start': 1984, 'end': 2004, 'name': 'PHASE 1:\nGovernment Research\n~$50-100M', 'y': 7.5, 'color': '#FFE5E5'},
    {'start': 2004, 'end': 2009, 'name': 'PHASE 2:\nDARPA Challenges\n~$20M', 'y': 6, 'color': '#FFE5F0'},
    {'start': 2009, 'end': 2016, 'name': 'PHASE 3:\nGoogle R&D\n$1.1B+', 'y': 4.5, 'color': '#E5F9F7'},
    {'start': 2016, 'end': 2027, 'name': 'PHASE 4:\nWaymo Commercial\n$30B+ (Alphabet)\n$11B+ (External)', 'y': 3, 'color': '#E5F4FF'},
]

# Draw phase backgrounds
for phase in phases:
    rect = FancyBboxPatch((phase['start'], phase['y']-0.4),
                          phase['end']-phase['start'], 0.8,
                          boxstyle="round,pad=0.05",
                          facecolor=phase['color'],
                          edgecolor='gray',
                          linewidth=1.5,
                          alpha=0.3)
    ax.add_patch(rect)
    ax.text(phase['start'] + (phase['end']-phase['start'])/2, phase['y'],
            phase['name'],
            ha='center', va='center',
            fontsize=9, fontweight='bold',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.7))

# Plot events
for event in events:
    color = colors[event['funder']]

    # Event marker
    ax.plot(event['year'], event['y'], 'o', markersize=12, color=color,
            markeredgecolor='black', markeredgewidth=1.5, zorder=5)

    # What happened (bold)
    ax.text(event['year'], event['y'] + 0.35, event['what'],
            ha='center', va='bottom', fontsize=8, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=color, linewidth=2))

    # Who (normal)
    ax.text(event['year'], event['y'] - 0.25, event['who'],
            ha='center', va='top', fontsize=7, style='italic',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='lightyellow', alpha=0.8))

# Draw timeline spine
ax.plot([1984, 2027], [2, 2], 'k-', linewidth=3, zorder=1)

# Year markers
for year in range(1985, 2028, 5):
    ax.plot([year, year], [1.9, 2.1], 'k-', linewidth=2)
    ax.text(year, 1.6, str(year), ha='center', fontsize=10, fontweight='bold')

# Title and labels
ax.text(2005.5, 9.5, 'AUTONOMOUS VEHICLES: 40-YEAR TIMELINE',
        ha='center', fontsize=16, fontweight='bold')
ax.text(2005.5, 9.1, 'From DARPA Research to Waymo Commercialization',
        ha='center', fontsize=12, style='italic')

# Legend for funding sources
legend_elements = [mpatches.Patch(facecolor=colors[key], edgecolor='black', label=key)
                   for key in colors.keys()]
ax.legend(handles=legend_elements, loc='lower left', fontsize=10, title='Funding Source')

# Investment summary box
summary_text = '''TOTAL INVESTMENT: $40+ BILLION (1984-2025)

DARPA (1984-2007):        ~$100M
Google (2009-2016):       $1.1B
Alphabet (2016-2025):     ~$30B
External VC (2020-2024):  $11B

TIME TO MARKET: 40 years
Revenue (2024): $125M (Year 40)'''

ax.text(2027.5, 1, summary_text,
        ha='left', va='bottom', fontsize=8,
        bbox=dict(boxstyle='round,pad=0.5', facecolor='lightyellow', edgecolor='black', linewidth=2),
        family='monospace')

# Remove axes
ax.set_xticks([])
ax.set_yticks([])
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['bottom'].set_visible(False)
ax.spines['left'].set_visible(False)

plt.tight_layout()
plt.savefig('autonomous-vehicles-timeline.png', dpi=300, bbox_inches='tight')
print("Timeline saved as 'autonomous-vehicles-timeline.png'")
plt.show()
