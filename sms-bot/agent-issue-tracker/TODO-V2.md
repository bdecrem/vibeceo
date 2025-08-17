# Issue Tracker V2 - Implementation Tasks

## Phase 1: Fix Core Pipeline (Stop Over-Processing) ✅ COMPLETED

### Problem
The agent is reformulating user requests into generic tickets, losing critical context that Claude Code needs to understand and fix issues properly.

### Tasks
- [x] **Preserve original user request in reformulate-issues.js**
  - Store both original and reformulated versions
  - Keep user's exact wording as `original_request` field
  
- [x] **Modify fix-issues.js to use original context**
  - Pass original user request to Claude Code, not reformulated summary
  - Include reformulation as supplementary context only
  - Remove generic "implement the fix" instructions
  - Let Claude Code decide approach based on actual request

- [x] **Add complexity assessment**
  - Classify issues as: simple, medium, complex, research
  - Route complex issues to planning phase first
  - Only auto-fix simple/medium issues with clear scope

- [ ] **Test with issue #2101**
  - Verify Claude Code receives full context about classifier routing
  - Confirm it can create proper implementation plan

## Phase 2: Add ASH.TAG Voice Integration

### Problem  
ASH.TAG comments are generated without knowing what Claude Code actually did, making them generic and disconnected from the real work.

### Tasks
- [ ] **Capture Claude Code's actual output**
  - Store full Claude output, not just success/failure
  - Parse what files were changed and why
  - Extract Claude's reasoning and approach

- [ ] **Create unified personality prompt**
  - Add ASH.TAG personality to fix-issues.js prompts
  - Include traits: "systems thinker", "elegant solutions", "have your cake and eat it too"
  - Make Claude Code explain its approach in ASH.TAG's voice

- [ ] **Option: Post-process commentary**
  - If unified approach too complex, add separate ASH.TAG commentary
  - Base comments on Claude's actual work, not generic templates
  - Include technical details in personality-appropriate voice

- [ ] **Update issue records with both technical and personality content**
  - Store Claude's technical analysis
  - Store ASH.TAG's commentary
  - Display both in issue tracker UI

## Testing Plan

1. **Test simple issue** - Bug fix or typo correction
2. **Test complex issue** - Like #2101 routing refactor  
3. **Test with joke/test submission** - Verify Cass.ink personality still works
4. **Verify ASH.TAG voice** - Check commentary matches actual work done

## Success Criteria

- [ ] Complex issues like #2101 get proper implementation plans
- [ ] Claude Code receives original user context, not generic summaries
- [ ] ASH.TAG comments accurately describe what was actually done
- [ ] System maintains backward compatibility with existing issues
- [ ] Personality voices (ASH.TAG, Cass.ink) are consistent and on-brand