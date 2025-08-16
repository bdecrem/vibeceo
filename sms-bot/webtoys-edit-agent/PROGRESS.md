# Webtoys-Edit-Agent Implementation Progress

## Project Overview
Building an experimental feature to let users edit Webtoys using Claude CLI agent via SMS command `--revise`.

**Branch**: Edit  
**Start Date**: January 16, 2025  
**Developer**: Claude Code with Bart

## Architecture Decisions
- **Command**: `--revise [app-slug] [edit request]`
- **Versioning**: Add revisions field to existing wtaf_content records
- **Processing**: Async via agent (similar to issue-tracker)
- **Safety**: Preserve original HTML, validate edits before deploying

## Implementation Progress

### Phase 1: MVP Setup

#### ✅ Task 1: Create Progress Document
- **Status**: COMPLETED
- **Time**: 10:45 AM
- **Notes**: Created this PROGRESS.md to track implementation

#### ✅ Task 2: Create Directory Structure
- **Status**: COMPLETED
- **Time**: 10:46 AM - 11:05 AM
- **Files created**:
  - [x] /webtoys-edit-agent/PROGRESS.md
  - [x] /webtoys-edit-agent/CLAUDE.md
  - [x] /webtoys-edit-agent/monitor.js
  - [x] /webtoys-edit-agent/collect-edit-requests.js
  - [x] /webtoys-edit-agent/process-edits.js
  - [ ] /webtoys-edit-agent/validate-edits.js
  - [ ] /webtoys-edit-agent/deploy-edits.js
  - [x] /webtoys-edit-agent/prompts/edit-instructions.md
  - [x] /webtoys-edit-agent/prompts/safety-rules.md

#### ✅ Task 3: Clone Core Files from agent-issue-tracker
- **Status**: COMPLETED
- **Time**: 11:00 AM - 11:05 AM
- **Notes**: Adapted monitor.js, created collection and processing scripts
- **Files to adapt**:
  - [ ] monitor.js → adapt for edit pipeline
  - [ ] Basic structure from reformulate-issues.js → process-edits.js
  - [ ] Supabase integration patterns

#### ⏳ Task 4: Implement --revise Command
- **Status**: PENDING
- **Location**: sms-bot/engine/controller.ts
- **Changes needed**:
  - [ ] Add --revise detection
  - [ ] Parse app slug and edit request
  - [ ] Queue edit request
  - [ ] Return confirmation message

#### ⏳ Task 5: Database Schema Updates
- **Status**: PENDING
- **Changes**:
  ```sql
  -- Add to wtaf_content:
  ALTER TABLE wtaf_content ADD COLUMN revisions JSONB DEFAULT '[]';
  ALTER TABLE wtaf_content ADD COLUMN current_revision INTEGER DEFAULT 0;
  
  -- Create edit requests table:
  CREATE TABLE wtaf_edit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES wtaf_content(uuid),
    app_slug TEXT NOT NULL,
    edit_request TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    error_message TEXT,
    revision_id INTEGER
  );
  ```

#### ⏳ Task 6: Process Edits Implementation
- **Status**: PENDING
- **Key components**:
  - [ ] Load original HTML
  - [ ] Create Claude prompt
  - [ ] Execute via Claude CLI
  - [ ] Capture and parse response

#### ⏳ Task 7: Validation & Safety
- **Status**: PENDING
- **Checks to implement**:
  - [ ] HTML well-formedness
  - [ ] Preserve critical functions (ZAD, games)
  - [ ] No dangerous code injection
  - [ ] Size limits

#### ⏳ Task 8: Initial Testing
- **Status**: PENDING
- **Test cases**:
  - [ ] Simple style change (background color)
  - [ ] Text content update
  - [ ] Game parameter adjustment
  - [ ] Rollback functionality

## Code Snippets & Notes

### Command Detection Pattern
```javascript
// In controller.ts
if (lowerMessage.startsWith('--revise ')) {
    const parts = lowerMessage.substring(9).trim().split(' ');
    const appSlug = parts[0];
    const editRequest = parts.slice(1).join(' ');
    // Queue and process...
}
```

### Claude Prompt Structure
```markdown
You are editing an existing Webtoy HTML application.

ORIGINAL HTML:
[html content here]

EDIT REQUEST:
[user's request]

RULES:
1. Preserve all functionality
2. Don't break API calls
3. Maintain game loops
...
```

### Safety Validation Example
```javascript
function validateEdit(originalHtml, editedHtml, appType) {
    // Check critical elements preserved
    if (appType === 'zad') {
        assert(editedHtml.includes('/api/zad/save'));
        assert(editedHtml.includes('/api/zad/load'));
    }
    // More checks...
}
```

## Issues & Blockers

### Issue 1: Claude CLI Path
- **Problem**: Need to use full path for cron compatibility
- **Solution**: Use `/Users/bartdecrem/.local/bin/claude`
- **Status**: Will implement correctly from start

## Testing Log

### Test Run 1: [PENDING]
- **Date**: TBD
- **Test**: Simple background color change
- **Result**: 
- **Notes**: 

## Deployment Notes

- Agent will run separately from issue-tracker
- Can be enabled/disabled via STOP-EDIT-AGENT.txt file
- Initial deployment will be manual trigger only (no cron)

## Next Session TODOs
- [ ] Complete directory structure
- [ ] Implement basic pipeline
- [ ] Test with simple edit
- [ ] Document learnings

## Current Status

### ✅ Completed So Far:
1. Created complete directory structure for webtoys-edit-agent
2. Wrote comprehensive CLAUDE.md documentation
3. Created safety rules and edit instructions for Claude
4. Built monitor.js orchestrator (adapted from issue-tracker)
5. Implemented collect-edit-requests.js for gathering edits
6. Created process-edits.js with Claude CLI integration (using correct full path)

### 🔄 Next Steps:
1. **IMMEDIATE**: Implement `--revise` command in controller.ts
2. Create database migration for edit_requests table and revisions field
3. Build validate-edits.js for safety checking
4. Create deploy-edits.js for saving revisions
5. Test with a simple edit case

### 📝 Key Implementation Notes:
- Using full Claude path: `/Users/bartdecrem/.local/bin/claude`
- Safety-first approach: extensive validation before deploying
- Revision system keeps original intact (revision 0)
- Process is async via agent, not real-time

---

Last Updated: January 16, 2025 11:10 AM