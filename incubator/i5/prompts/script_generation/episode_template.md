# Episode Script Generation

Generate a complete podcast episode script from today's selected papers.

## Input

You will receive:
- Episode number and date
- 4 papers with:
  - Title
  - Abstract
  - Stage 2 analysis (desperate user, obvious business, etc.)
  - Score and priority
  - Any flags

## Output Structure

```
=== INTRO ===
[Follow intro_voice.md template]
[~120 words]

=== ITEM 1: [TITLE] ===

[SETUP - Neutral Voice]
(30 sec, ~60 words)
What this is in plain English. Why it matters. No jargon without explanation.

[VENTURE TAKE]
(60 sec, ~120 words)
Follow venture_take.md persona.
End with transition to scrappy.

[SCRAPPY TAKE]
(60 sec, ~120 words)
Follow scrappy_take.md persona.
End with open question or callback.

[TRANSITION]
(10 sec)
Brief bridge to next item.

=== ITEM 2: [TITLE] ===
[Same structure]

=== ITEM 3: [TITLE] ===
[Same structure]

=== ITEM 4: [TITLE] ===
[Same structure]

=== OUTRO ===
[Follow intro_voice.md outro template]
[~100 words]
```

## Voice Markers

Use these markers for audio generation parsing:

```
[INTRO_VOICE]
…text…
[/INTRO_VOICE]

[VENTURE]
…text…
[/VENTURE]

[SCRAPPY]
…text…
[/SCRAPPY]
```

## Tone Calibration

- Read the abstract, then forget the jargon
- Explain like you're telling a smart friend at a bar
- Acknowledge uncertainty: "if this holds up", "the claim is", "assuming the benchmarks are real"
- No superlatives: not "amazing", "incredible", "groundbreaking"
- Okay to be funny if it's natural, never forced

## Quality Checks

Before outputting, verify:
- [ ] Each item is actually different (no overlap in themes)
- [ ] Venture and Scrappy takes are genuinely different angles
- [ ] No jargon left unexplained
- [ ] Concrete customer mentioned in Scrappy take
- [ ] Episode flows (transitions work)
- [ ] Total runtime ~15-18 min at 150 words/min

## Example Item

```
=== ITEM 2: Sparse Attention for 100K Context ===

[INTRO_VOICE]
Next up - a paper from a team at Stanford on attention mechanisms. Sounds dry, but this one actually matters if you've ever hit a context limit.
[/INTRO_VOICE]

[VENTURE]
Transformers have a scaling problem - attention is quadratic, so 100K context costs way more than 10K. This paper claims linear scaling with minimal quality loss.

If true, this is infrastructure. Every foundation model eventually adopts this or something like it. The play isn't the research - it's tooling. Who builds the drop-in attention layer that makes every model cheaper to run?

That's a picks-and-shovels business. You're selling to every AI lab and every company running inference at scale. Defensibility comes from being first and becoming standard.

The billion dollar version is: you're the Intel inside every LLM deployment.
[/VENTURE]

[SCRAPPY]
Cool, but here's the weekend version: don't build infrastructure, use it.

Take this implementation, wrap it in a service, and offer "analyze your entire codebase in one prompt" to dev agencies. They're currently chunking and praying. You give them whole-repo context.

Charge $200/month. Your customer is the three-person agency doing code audits. Landing page: "Your entire codebase, one conversation."

You're not building attention research. You're arbitraging the gap between what's in papers and what's in products.
[/SCRAPPY]
```
