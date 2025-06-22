# WTAF Complete Flow Debugger

This script shows you EXACTLY what happens at every step of the WTAF processing pipeline.

## What It Shows

1. **User Input** - What the user typed
2. **Classifier Input** - The full system prompt we send to GPT-4o classifier
3. **Classifier Output** - The expanded product brief that comes back
4. **Builder Input** - The full prompt we send to Claude (system prompt + product brief + WTAF cookbook)
5. **Builder Output** - The final HTML that gets generated

## Usage

### Single Test
```bash
node debug-complete-flow.js "build a chat page for me and my friend"
```

### Multiple Tests
```bash
node run-debug-flow-test.js
```

**Note**: Make sure to run `npm run build` first to compile the TypeScript modules.

## Output

The script creates two outputs:
1. **Console output** - Live display of the entire flow
2. **Log file** - Saved to `logs/debug-flow-[timestamp].txt`

## Example Output Structure

```
╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                   WTAF COMPLETE FLOW DEBUGGER                                           ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝

🔸 STEP 1: USER INPUT
============================================================
build a chat page for me and my friend

🔸 STEP 2: WHAT WE SEND TO CLASSIFIER
============================================================
CLASSIFIER SYSTEM PROMPT:
----------------------------------------
[Full classification system prompt with ZAD instructions...]

CLASSIFIER USER MESSAGE:
----------------------------------------
build a chat page for me and my friend

🔸 STEP 3: WHAT CLASSIFIER RETURNS
============================================================
[Expanded product brief with ZERO_ADMIN_DATA: true, user count analysis, etc...]

🔸 STEP 4: WHAT WE SEND TO BUILDER
============================================================
BUILDER SYSTEM PROMPT:
----------------------------------------
[Full builder system prompt...]

BUILDER USER PROMPT:
----------------------------------------
[Product brief + complete WTAF cookbook...]

🔸 STEP 5: WHAT BUILDER RETURNS
============================================================
[Complete HTML with embedded CSS and JavaScript...]

🔸 PROCESSING SUMMARY
============================================================
✅ Input processed: "build a chat page for me and my friend"
✅ Classifier detected: ZAD
✅ Builder output length: 15847 characters
✅ Contains HTML: YES
✅ Debug file saved: logs/debug-flow-2025-06-22T...txt
```

## Use Cases

- **Debugging classification issues** - See exactly what the classifier is deciding
- **Understanding ZAD vs regular apps** - Compare how different requests are processed
- **Prompt engineering** - See the full prompts being sent to each AI
- **Quality assurance** - Verify the complete pipeline is working correctly
- **Training** - Understand how the 2-step system works

## Pro Tips

1. **Save the output files** - They're great for comparing different requests
2. **Test edge cases** - Try ambiguous requests to see how they're classified
3. **Compare ZAD vs regular** - Run both types to see the differences
4. **Check coach injection** - Test with `-donte-` syntax to see coach personality injection

This script is your window into the entire WTAF brain! 🧠 