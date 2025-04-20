# 🎮 Advisors Foundry Discord Bot: GPT Pitch Analysis + Dialogue Generation

This document describes the full workflow and implementation for generating a two-round Discord-style startup pitch discussion with 6 AI coaches, ending in individual votes and a final score. This system builds on:

1. Your existing Discord bot (already functional)
2. Your ChatGPT API call, which returns 4 analysis scores and rationales per pitch

---

## ✅ Step 1: Input – Pitch Analysis Format

You already receive this object:

```ts
type PitchAnalysis = {
  joke_level: number;     // 1–10
  development: number;    // 1–10
  quality: number;        // 1–10
  novelty: number;        // 1–10
  rationale: {
    joke_level: string;
    development: string;
    quality: string;
    novelty: string;
  };
  pros: string[];         // (optional)
  cons: string[];
}
```

---

## 🧠 Step 2: Derive Context Flags

From the analysis, set these flags:

```ts
const jokeMode = analysis.joke_level >= 7;
const underdevelopedMode = analysis.development <= 4 && analysis.joke_level < 7;
```

These control tone and behavior for the coaches.

---

## 🗣️ Step 3: Generate Round 1 Coach Reactions

For each coach, generate a prompt like:

```ts
const coachPrompt = ({
  coachName,
  coachSystemPrompt,
  pitch,
  assignedPoint,
  analysis,
  jokeMode,
  underdevelopedMode
}) => \`
You are \${coachName}, an AI coach in a Discord-style conversation with other startup mentors.

Startup Pitch: "\${pitch}"

Key analysis:
- Joke Level: \${analysis.joke_level} (\${analysis.rationale.joke_level})
- Development: \${analysis.development} (\${analysis.rationale.development})
- Quality: \${analysis.quality} (\${analysis.rationale.quality})
- Novelty: \${analysis.novelty} (\${analysis.rationale.novelty})

You are responding in Round 1. Stay in character and speak in your voice. Mention or riff on this point: "\${assignedPoint}".

\${jokeMode ? "Note: This pitch is unserious or absurd. You can be playful, sarcastic, or imaginative." : ""}
\${underdevelopedMode ? "Note: This pitch is vague or undeveloped. Feel free to speculate, express curiosity, or critique the lack of clarity." : ""}

Format your reply like a Discord post: start with '**YourName:**' and keep it short, punchy, and fun. You are not summarizing—you are reacting.
\`;
```

Generate 6 unique messages from this (1 per coach).

---

## 🔁 Step 4: Generate Round 2 Reactions

Modify the above prompt with:

```text
You are responding in Round 2. Your job is to react to another coach’s message from Round 1. Disagree, agree, roast them, build on their point, or pivot to your own. Stay on-brand.
```

Feed in all Round 1 messages as context.

---

## 🗳️ Step 5: Voting Round Prompt

Each coach gets this:

```ts
Final round. You've seen the full conversation.

Give a 0–10 score for this pitch based on your actual opinion (in character). Use real investor logic: joke ideas get low scores, great ideas get high scores.

Include:
- A numeric score
- A short comment (1–2 sentences max)
- Emojis optional
- Keep the tone aligned with your personality
```

---

## 📊 Step 6: Calculate Final Score

```ts
const average = (votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(1);
```

Add a contextual closing:

```markdown
**Final Score: \${average}/10**

\${jokeMode ? "This one was chaos." : underdevelopedMode ? "There's a spark here—but needs more clarity." : "A solid debate, even if we didn’t all agree."}
```

---

## 🧩 Example Use Flow in Cursor

- Input: pitch + scores
- Set flags
- Assign pros/cons per coach
- Generate Round 1 (6 prompts)
- Generate Round 2 (6 prompts)
- Generate 6 votes
- Compute average
- Output final transcript for Discord

This pipeline allows fun, consistent, and characterful discussions—whether the pitch is brilliant, vague, or pure chaos.

Let me know if you want pre-written code stubs or Figma UI for coach avatars and reactions.