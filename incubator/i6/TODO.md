# i6 - Progressive Search Integration TODO

## Progressive Search System - COMPLETED ✅

The core progressive search system is fully built and tested:
- ✅ All 3 steps (clarify, discover channels, execute search)
- ✅ All base prompts (step1, step2, step3)
- ✅ Category prompts for recruiting, leadgen, job_search, general
- ✅ Full end-to-end testing (leadgen workflow)
- ✅ Database schema and library code
- ✅ Iterative learning and feedback loop
- ✅ Usage documentation (USAGE.md)

**Location:** `../../progressive-search/` (relative to incubator/i6)

---

## Remaining Progressive Search Improvements

### Testing & Validation
- [ ] Test error cases (bad UUIDs, missing data, malformed input)
- [ ] Test edge cases (empty channels, no results, rate limits)
- [ ] Document common issues and troubleshooting steps

### Code Quality
- [ ] Add better error handling for malformed JSON commands
- [ ] Add retry logic for database operations
- [ ] Improve command parser error messages
- [ ] Remove unused APPROVE_CHANNELS command (if exists)

### Category Coverage
- [ ] Verify job_search step 1 prompt exists (we have steps 2 & 3)
- [ ] Add pet_adoption category prompts (mentioned in schema but not implemented)

### Future Enhancements (Low Priority)
- [ ] Add RLS policies for user authentication (when needed)
- [ ] Create REST API wrapper for HTTP access
- [ ] Add webhook support for external integrations
- [ ] Create video walkthrough (optional)

---

## i6 Agent Integration - IN PROGRESS 🔄

### Core Setup
- [x] Archive old planning documents
- [ ] Create CLAUDE.md (persona, purpose, how to use progressive search)
- [ ] Create LOG.md (project history)
- [ ] Create usage.md (time/token tracking)
- [ ] Create EXTERNAL-CHANGES.md (if needed)
- [ ] Create MIGRATIONS.md (if needed)

### Slash Command Setup
- [ ] Document how to invoke i6 (is slash command needed?)
- [ ] Create example commands for other agents to use progressive search
- [ ] Document integration pattern for incubator agents

### Integration with Incubator Agents
- [ ] Document how business builders can use progressive search for lead generation
- [ ] Document how Nix (i2) can use it for market research
- [ ] Create example workflows for other agents

### Automation & Scheduling (Future)
- [ ] Consider if i6 needs scheduled runs (like recruiting agent)
- [ ] Decide if i6 should monitor leads continuously or on-demand
- [ ] Integration with SMS bot (if needed for notifications)

---

## Questions to Clarify

1. **Slash Command:** Does i6 need a `/i6` or `/leadgen` slash command, or is it just documentation?
2. **Agent Persona:** Should i6 have a full persona like Forge/Nix, or is it purely infrastructure?
3. **Scheduling:** Should i6 run searches automatically, or only when invoked?
4. **SMS Integration:** Should lead results be sent via SMS to human, or just stored in DB?
5. **Scope:** Is i6 ONLY for finding leads for incubator products, or broader?

---

## Notes

- Progressive search is **category-agnostic** - works for recruiting, leadgen, job search, general research, etc.
- i6's role is to **provide leadgen infrastructure** for other incubator agents
- System is **CLI-based** - can be called from Python, TypeScript, or terminal
- All data is **database-backed** (Supabase) for persistence and resumability
