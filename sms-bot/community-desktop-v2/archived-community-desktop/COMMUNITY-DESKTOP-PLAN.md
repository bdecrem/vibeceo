# Community Desktop Implementation Plan

## Full Implementation Plan for Community Desktop Experiment

### Phase 1: Setup Infrastructure (30 min)
- [x] 1. **Copy the agent-issue-tracker structure** to create our new community-desktop system
- [x] 2. **Create desktop.html template** with retro Windows 95 styling and a place for app icons
- [x] 3. **Create submission ZAD app** where users submit their app ideas ("What app?" "What does it do?")

### Phase 2: Transform the Pipeline (45 min)
- [x] 4. **Transform reformulate-issues.js → process-apps.js**
   - Instead of reformulating issues, convert user submissions into app specifications
   - Generate: app name, emoji icon, simple JavaScript code, desktop position
   - Example: "dice roller" → `{name: "Lucky Dice", icon: "🎲", code: "alert('You rolled: ' + Math.ceil(Math.random()*6))"}`

- [x] 5. **Transform fix-issues.js → add-to-desktop.js**
   - Read current desktop.html
   - Inject new app icon with onclick handler
   - Auto-position to avoid overlaps
   - Commit changes back to repository

- [x] 6. **Update monitor.js**
   - Orchestrate the new pipeline flow
   - Process submissions → Generate apps → Update desktop → Deploy

### Phase 3: Testing & Deployment (30 min)
- [ ] 7. **Test locally with sample submissions**
   - Create a few test app ideas
   - Verify the pipeline processes them correctly
   - Check that apps appear on the desktop

- [ ] 8. **Deploy desktop.html to webtoys**
   - Create the public-facing desktop page
   - Make it accessible at a URL like webtoys.ai/community-desktop

- [ ] 9. **Deploy submission form**
   - Deploy the ZAD app for submissions
   - Link it from the desktop taskbar

- [ ] 10. **Optional: Set up cron job**
   - Configure to run every 2 minutes
   - Or manually trigger for testing

### Expected Timeline
- **Hour 1**: Infrastructure setup and pipeline transformation
- **Hour 2**: Testing, debugging, and deployment
- **Result**: A live community desktop that grows with user contributions!

### Sample Apps to Seed It With
- "Compliment Button" - Shows random nice messages
- "Backwards Clock" - Time runs in reverse  
- "Pet Rock" - Name and talk to a rock
- "Mood Ring" - Changes page color based on "mood"
- "Fortune Cookie" - Generates fortunes

### Progress Log
_Updates will be added here as tasks are completed_