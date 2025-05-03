# WeekendVibes Scene 1 Implementation Checklist

- [x] 1. Design the scene-setting prompt (time, location, venue, duration, vibe)
- [x] 2. Define coach personality prompt templates
- [x] 3. Implement multi-turn conversation logic (6–9 turns, lively banter)
- [x] 4. Summarize the plan in character
- [x] 5. Store the agreed plan outcome for use in subsequent scenes
- [x] 6. Integrate with Discord bot (send messages in sequence)
- [x] 7. Test and refine output for fun and authenticity

---

## Coach Personality Prompt Templates

**Alex:**
- Visionary, spiritual, loves big ideas and poetic language. Teases others about their lack of vision, but always with warmth.

**Donte:**
- Hyper-productive, competitive, obsessed with efficiency and optimization. Loves to one-up others, but in a playful way. Tech and data references.

**Kailey:**
- Creative, sensitive, loves art and music. Brings up feelings, vibes, and aesthetics. Gentle teasing, but stands her ground.

**Venus:**
- Wellness guru, mystical, always referencing energy, chakras, and balance. Suggests unusual or holistic activities. Playfully mystical.

**Rohan:**
- Storyteller, practical, loves food and local culture. Brings humor, sometimes dry or sarcastic. Anchors the group in reality.

**Eljas:**
- Analytical, skeptical, loves to poke holes in plans. Brings up risks, logistics, and edge cases. Dry wit, but secretly enjoys the chaos.

## Multi-Turn Conversation Logic Approach

- The conversation consists of 6–9 turns, alternating between coaches.
- Each message is generated using the coach's personality template, the current scene context (time, location, venue, duration), and the conversation so far.
- Prompts for each coach instruct them to:
  - Reference the previous message
  - Be witty, playful, and true to character
  - Tease, riff, and build on the group's energy
- The conversation advances toward a plan, but the focus is on lively banter and character dynamics.
- The logic supports both round-robin and random coach selection for each turn, ensuring variety and group chemistry.

## Plan Summary Approach

- After the final round of banter, generate a summary message that recaps the agreed plan.
- The summary should be written in a playful, in-character style, referencing:
  - The plan details (what, where, when)
  - The unique contributions or quirks of each coach
  - Any running jokes or memorable moments from the conversation
- Example:
  "Against all odds, Donte has agreed to karaoke, but only if he can bring his productivity tracker. Kailey is already warming up her vocal cords. Venus is meditating in the corner. Rohan is just here for the currywurst. Tonight, Berlin won't know what hit it."
- This summary will be stored and used to drive the next 23 scenes.

## Plan Storage Approach

- After generating the in-character summary of the plan, store it in a dedicated file (e.g., `data/weekendvibes-plan.json`).
- The file will contain:
  - The plan summary (string)
  - Any relevant metadata (e.g., location, venue, duration, participating coaches)
- Subsequent scenes (2–24) will read this file to determine the context and activities for the rest of the episode.
- This approach ensures the plan is persistent and accessible across bot restarts or scene transitions.

## Discord Bot Integration Approach

- The bot will send each message (scene intro, coach banter, plan summary) to the Discord channel in sequence.
- Short delays (e.g., 1–3 seconds) will be added between messages for realism and pacing.
- The integration will ensure:
  - The scene intro is posted first
  - Each coach's message is posted in turn, using their personality template
  - The final plan summary is posted last
- Error handling will ensure the conversation continues even if a message fails to send.
- The agreed plan will be saved immediately after the summary is posted, making it available for subsequent scenes.

## Testing & Refinement Approach

- Run the full Scene 1 flow in a test Discord channel.
- Review the generated messages for:
  - Coach personality and banter
  - Liveliness, wit, and group chemistry
  - Realism and immersion (scene, time, place)
  - Plan summary clarity and character
- Gather feedback from users or team members.
- Tweak prompt templates, message sequencing, or logic as needed to maximize fun and authenticity.
- Repeat until the output consistently feels lively, true to character, and engaging. 