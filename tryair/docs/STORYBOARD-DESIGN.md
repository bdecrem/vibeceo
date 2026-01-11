# Storyboard System Design

## Current State (v1)

All images get text overlaid in the **bottom 25% safe zone**.
- Script generation produces `part1` and `part2` text
- Each scene gets its corresponding text overlaid
- Simple, consistent positioning

## Future State (v2)

The script generation will produce a **storyboard** where each scene can specify:
1. Whether it needs text overlay at all
2. What text to show
3. Where the safe zone should be (bottom, top, center, none)
4. Duration timing hints

### Proposed Script Format

```json
{
  "scenes": [
    {
      "id": 1,
      "imagePromptHint": "Person looking contemplative at sunrise",
      "text": "What if you could know?",
      "textPosition": "bottom",  // or "top", "center", "none"
      "duration": 3.5
    },
    {
      "id": 2,
      "imagePromptHint": "Abstract flowing data visualization",
      "text": null,  // No text overlay for this scene
      "textPosition": "none",
      "duration": 2.0
    },
    {
      "id": 3,
      "imagePromptHint": "Product shot with clean background",
      "text": "Start your journey today",
      "textPosition": "center",
      "duration": 4.0
    }
  ],
  "voiceover": "Full narration script here..."
}
```

### Workflow Changes Required

1. **Script generation** must output storyboard format
2. **Image generation** must read `textPosition` and adjust safe zone in prompt
3. **Overlay** must respect `textPosition` per scene
4. **Video assembly** must use scene-specific durations

### Safe Zone Positions

| Position | Image prompt instruction | Overlay placement |
|----------|-------------------------|-------------------|
| `bottom` | "Leave bottom 25% clear" | Bottom 25% |
| `top` | "Leave top 25% clear" | Top 25% |
| `center` | "Leave center band clear" | Middle 30% |
| `none` | No restriction | No text overlay |

### Implementation Notes

- The AI script generator should be prompted to think cinematically
- Scenes without text work well for B-roll/transition moments
- Variable durations allow for dramatic pacing
- Text-free scenes can have more complex compositions
