# Project 04: Agent Mode

## Context
Add conversational refinement via Claude agent. User clicks "Let's discuss..." to provide feedback, agent interprets and generates new creative directions.

## Tasks
- [ ] Task 1: Create agent API route (`/inspiration/api/agent`)
- [ ] Task 2: Build agent chat UI component
- [ ] Task 3: Implement feedback → new comps flow
- [ ] Task 4: Update comp selection to show all generated comps (A/B/C/D...)
- [ ] Task 5: Add conversation history to agent context

## Completion Criteria
- [ ] `npm run build` passes
- [ ] User can provide feedback text
- [ ] Agent generates new comps based on feedback
- [ ] New comps appear alongside original comps

## Notes
- Agent receives: original topic, current comp descriptions, user feedback
- Agent outputs: 2 new comp descriptions + reasoning
- Keep conversation history for context
- Use Claude Sonnet for agent responses
