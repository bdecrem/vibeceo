# Project: Agent Prompt

## Context
Update the Python agent to parse attachments and include sample kit creation instructions in the system prompt.

## Tasks
- [x] Parse `attachments` from input JSON in `run_amber_task()`
- [x] Build attachment context string for prompt
- [x] Add sample kit creation instructions to system prompt

## Completion Criteria
- [x] Agent logs received attachments
- [x] Prompt includes kit creation instructions when audio files present
- [ ] Agent can successfully create a kit from samples (needs testing)

## Notes
**File:** `sms-bot/agents/amber-email/agent.py`

**Parse attachments:**
```python
attachments = input_data.get("attachments", [])

# Build attachment context for prompt
attachment_context = ""
if attachments:
    audio_files = [a for a in attachments if a.get("name", "").lower().endswith((".wav", ".mp3", ".aiff", ".ogg"))]
    if audio_files:
        attachment_context = "\n## Audio Attachments Received\n"
        for att in audio_files:
            attachment_context += f"- {att['name']} ({att['size']} bytes): {att['url']}\n"
        attachment_context += "\nThis looks like a sample kit upload. See instructions below.\n"
```

**Kit creation instructions to add to prompt:**
```
## Sample Kit Upload Instructions

If you receive audio attachments, the user is likely sending you samples for a new drum kit.

### Steps to Create a Kit:

1. **Analyze the samples**: Look at filenames to determine instrument types
   - Common patterns: kick, snare, hat, clap, tom, perc, fx
   - Assign to slots s1-s10 in this order: kicks → snares → claps → hats → toms → percussion → fx

2. **Generate kit metadata**:
   - Kit ID: lowercase, hyphenated (e.g., "moog-dark")
   - Kit name: Title case, descriptive (e.g., "Moog Dark")
   - Instrument names: Full name (e.g., "Moog Kick")
   - Short names: 2 chars (e.g., "MK")

3. **Download and save samples**:
   - Use curl to download from URLs
   - Save to web/public/90s/kits/{kit-id}/samples/s1.wav through s10.wav
   - If fewer than 10 samples, duplicate the most versatile ones

4. **Create kit.json** with name, description, and 10 slots

5. **Update index.json**: Add entry to web/public/90s/kits/index.json

6. **Create a jam page**:
   - Save to web/public/90s/{kit-id}-jam.html
   - Use amber-track.html as template
   - Create a pattern that showcases the samples

7. **Commit and push**: Include all files in one commit

8. **Reply with links**:
   - Sampler: kochi.to/90s/ui/r9ds/ (select new kit from dropdown)
   - Jam page: kochi.to/90s/{kit-id}-jam.html
```
