# Coach Dynamics Update Utility

## Overview

The `update-coach-dynamics.js` script provides a simple way to update the coach dynamics (irritation relationship) between episodes without needing to modify any core code.

This script updates the `currentIrritation` field in `data/story-themes/story-arcs.json`, which is used by the help command and other coach interaction features.

## When to Use

Use this script:
- At the start of a new episode when you want to change which coach is irritated
- Any time you notice the coach dynamics in the !help command are out of date
- When testing different coach interactions

## How to Use

```bash
node update-coach-dynamics.js <coach> <target> <incident>
```

### Parameters

- `coach`: The coach who is irritated (alex, donte, eljas, kailey, rohan, venus)
- `target`: The coach who is the target of irritation (alex, donte, eljas, kailey, rohan, venus)
- `incident`: The incident that caused the irritation (in quotes)

### Example

```bash
node update-coach-dynamics.js eljas rohan "He wrote a long anti-capitalist Slack comment… in the wrong channel."
```

### Verification

After running the script, you can verify the changes by running:

```bash
node test-scripts/test-help-command.js
```

This will show you what the !help command will display with the updated coach dynamics.

## Incidents Reference

Here are some example incidents for each coach that you can use:

### Eljas
- "His compost bin overflowed mid-Zoom."
- "He wrote a long anti-capitalist Slack comment… in the wrong channel."
- "His camera glitched mid-rant and froze on a weird face."

### Kailey
- "Her favorite pen broke before journaling."
- "She cried in voice notes and accidentally sent one."
- "Her self-care checklist got roasted in a comment thread."

### Alex
- "She posted a vision board with a typo in the headline."
- "Her sound bath livestream glitched… and looped."
- "Her Shopify theme reverted to a 2018 version."

### Donte
- "His pitch deck got overwritten by an old version."
- "His blazer squeaked audibly throughout a team sync."
- "His AI-generated leadership quote went mildly viral… as a joke."

### Rohan
- "He got locked out of his workspace before a big moment."
- "He changed his Zoom background and no one noticed."
- "He was muted during a perfect one-liner."

### Venus
- "Her automation kicked everyone off a project board."
- "She misspelled \"execution\" in a shared deck."
- "A VC called her \"too intense\" in a quote tweet."

## Implementation Details

The script:
1. Takes coach, target, and incident as command line parameters
2. Validates the coach and target names
3. Reads the current story-arcs.json file
4. Maintains the existing intensity structure
5. Updates the currentIrritation field
6. Writes the updated data back to the file

No other files or code are modified. 