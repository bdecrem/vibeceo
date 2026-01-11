# Project 04: Agent Mode

## Context
Add conversational refinement via Claude agent. User clicks "Let's discuss..." to provide feedback, agent interprets and generates new creative directions.

## Tasks
- [x] Task 1: Create agent API route (`/inspiration/api/agent`)
- [x] Task 2: Build agent chat UI component
- [x] Task 3: Implement feedback → new comps flow
- [x] Task 4: Update comp selection to show all generated comps (A/B/C/D...)
- [x] Task 5: Add conversation history to agent context

## Completion Criteria
- [x] `npm run build` passes
- [x] User can provide feedback text
- [x] Agent generates new comps based on feedback
- [x] New comps appear alongside original comps

## Notes
- Agent receives: original topic, current comp descriptions, user feedback
- Agent outputs: 2 new comp descriptions + reasoning
- Keep conversation history for context
- Use Claude Sonnet for agent responses
