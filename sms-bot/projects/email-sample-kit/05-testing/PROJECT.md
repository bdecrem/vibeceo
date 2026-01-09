# Project: Testing & Verification

## Context
Verify the complete flow works end-to-end: email with samples → kit created → jam page generated → deployed → links work.

## Tasks
- [ ] Unit test: Attachment extraction and Supabase upload
- [ ] Integration test: Email samples to amber@intheamber.com, verify agent flow
- [ ] End-to-end test: Wait for deploy, verify kit and jam page work

## Completion Criteria
- [ ] Kit appears in sampler dropdown
- [ ] Samples play correctly
- [ ] Jam page loads and plays

## Notes
**Unit test checklist:**
- Mock `req.files` with audio files
- Verify upload to Supabase succeeds
- Verify URLs are correctly formatted
- Verify attachments passed to agent

**Integration test:**
1. Send email with 3-5 WAV files to amber@intheamber.com
2. Verify agent receives attachments (check logs)
3. Verify kit created at `web/public/90s/kits/{slug}/`
4. Verify `index.json` updated
5. Verify jam page created
6. Verify commit and push succeeds
7. Verify reply email contains correct links

**End-to-end test:**
1. Wait for Railway deploy (~7 min)
2. Visit kochi.to/90s/ui/r9ds/
3. Select new kit from dropdown
4. Verify all samples load and play
5. Visit jam page URL
6. Verify pattern plays with visualization

**Edge cases to test:**
- 0 audio files (should not trigger kit creation)
- 3 files (should duplicate to fill 10 slots)
- 15 files (should pick best 10)
- Non-admin sender (should queue for approval)
