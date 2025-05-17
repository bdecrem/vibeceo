# Waterheater Chat Implementation Plan

## Overview
Implementation of a 6-message waterheater conversation where one coach experiences a small personal incident. This becomes the basis of a conversation where two other coaches respond, one of them triggering the affected coach. The resulting tension lingers throughout the rest of the episode, influencing all subsequent watercooler scenes.

## Implementation Steps

### 1. Basic Structure
- [x] Select random coach and incident
- [x] Select two additional coaches
- [x] Assign roles:
  - Affected Coach (incident happens to them)
  - Coach B (supportive/neutral)
  - Coach C (target who triggers tension)
  - Annoyed Coach (same as the affected coach)

### 2. Message Implementation
- [x] Message 1: Affected Coach casually shares incident
  - Use Prompt 1: "You are [Affected Coach]. Write 1 Discord-style message where you casually mention something that happened to you recently: [story_topic]. Keep it short, in character, and lightly amused or annoyed. Do not explain everything. Let it feel tossed off and cool."
  - Keep it short and in character
  - Lightly amused or annoyed tone
  - Tossed off and cool style

- [x] Message 2: Coach B responds supportively
  - Use Prompt 2: "You are [Coach B]. Respond to [Affected Coach]'s message about [story_topic]. Stay in character. React with either mild support, curiosity, or neutrality. Do not escalate or criticize."
  - Stay in character
  - No escalation or criticism

- [x] Message 3: Coach C responds with friction
  - Use Prompt 3: "You are [Coach C]. Respond to the ongoing conversation about [story_topic]. Say something dismissive, sarcastic, judgmental, or subtly off-tone. Stay fully in character. You are not trying to start a fight—but you say something that rubs [Affected Coach] the wrong way."
  - Stay in character
  - Subtly off-tone response
  - Trigger the affected coach

- [x] Message 4: Affected Coach pushes back
  - Use Prompt 4: "You are [Affected Coach]. You're starting to get annoyed at [Coach C] for how they responded. Stay in character. Don't overreact. Just let the tension come through in a dry, clipped, or sharp reply."
  - Show annoyance subtly
  - Stay in character
  - Dry, clipped, sharp reply

- [x] Message 5: Coach B or C follows up
  - Use Prompt 5: "You are [Coach B or Coach C]. Respond to the tension between [Affected Coach] and [Coach C]. You can either try to smooth things over or make it worse—choose whichever is more true to your character. Keep it short and emotionally precise."
  - If Coach B: Take on mediator role with character-appropriate response
    - Example: "You two should co-author a zine: 'Triggered by Tools: Notes on Emotional Infrastructure.'"
    - Use character's unique perspective to smooth tension
    - Keep it light but meaningful
  - If Coach C: Choose between escalating or backing off
    - Stay true to character's personality
    - Maintain the tension appropriately
  - Character-driven response
  - Emotionally precise

- [x] Message 6: Affected Coach closes
  - Use Prompt 6: "You are [Affected Coach]. Wrap up this moment with one final message. You are still annoyed at [Coach C]. Keep it brief, slightly cold, and in character. Do not resolve the tension. Let it hang."
  - Brief, slightly cold
  - Still annoyed at Coach C
  - Leave tension unresolved

### 3. Story Arc Creation
- [x] Create story arc after conversation
- [x] Track tension between affected coach and target coach
- [x] Set up influence on all subsequent watercooler scenes in the episode
- [x] Ensure tension lingers throughout the episode

## Progress
- Started: [Current Date]
- Current Step: Completed
- Status: All Steps Completed
- Next Step: Testing and Validation

## Notes
- All changes in `triggerWaterheaterChat` in `handlers.ts`
- Use exact prompt templates as provided, including all placeholders
- Maintain 2-second delays between messages
- Keep messages under 30 words
- No additional validation needed beyond basic error handling
- Ensure tension influences all subsequent watercooler scenes in the episode 