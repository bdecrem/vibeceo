# WTAF Request Processing Flow

## ARCHITECTURE OVERVIEW
**2-GPT-Call System:**
1. **Classifier GPT**: Detects request type + writes comprehensive product briefs (for ZAD apps)
2. **Builder GPT**: Takes product brief + WTAF design system → builds HTML

## USER PROMPT

### Game?
`wtaf-processor.ts` decides based on string capture (keywords: "game", "pong", "puzzle", "arcade").

**Yes**: `builder-game.json` sent to Builder GPT by `wtaf-processor.ts`

**Else**: Continue to classification

### Classifier Prompt Constructed
- Controller: `controller.ts` orchestrates the workflow
- Processor: `wtaf-processor.ts` handles AI logic (classifier + builder)
- Coach injection logic: extracts coach from "wtaf -coach- request" syntax
- Coach personalities: loaded from `sms-bot/content/coaches/` directory (alex.json, donte.json, etc.)
- General design instructions: `app-tech-spec.json` (WTAF Cookbook & Style Guide)

### Classifier Logic (Sequential Decision Tree):
**Files**: 
- `sms-bot/content/classification/needs-email.json` - Simple email display logic (Step 1)
- `sms-bot/content/classification/is-it-a-zad.json` - Zero Admin Data logic (Step 2)
- `sms-bot/content/classification/needs-admin.json` - Data collection with admin logic (Step 3)
- `sms-bot/engine/classifier-builder.ts` - Combines files into sequential decision tree

**Sequential Logic:**
1. **Step 1:** Does it just need email display? → `simple_email`
2. **Step 2:** Is it a ZAD collaborative app? → `zero_admin_data` + **write comprehensive product brief**
3. **Step 3:** Does it need admin/data collection? → `data_collection` 
4. **Step 4:** Fallback to standard app → `standard_app`

#### Needs just an email address or "one thing"?
   • Analyzes for simple contact scenarios like business cards, portfolios, basic landing pages
   • Detection: pages that only need a contact email displayed
   • If yes:
      - `wtaf-processor.ts` constructs Builder Prompt: `builder-app.json` (system prompt) + `app-tech-spec.json` (WTAF design system) + email placeholder instructions
      - Processor sets `EMAIL_NEEDED: true` metadata
      - Uses `[CONTACT_EMAIL]` placeholder for later replacement

#### Is it a ZAD (Zero Admin Data)?
   • Looks for collaborative language patterns like "me and my friends", "our team", "study group", "chat page for me and my friend"
   • Multi-user social apps that store data but don't need admin interfaces
   • If yes:
      - **Classifier writes comprehensive product brief** including:
        - User count analysis ("me and my friend" = 2 people)
        - UI approach (dual-column for 2 people, group dynamics for 3-5)
        - Archetype selection (sticky_note_wall, topic_buckets, confetti_timeline, etc.)
        - Authentication method (emoji + passcode)
        - Core features and user flow
        - Database structure needed
      - **Accepts chat/messaging requests** - implements as async message boards, not real-time chat
      - **No longer uses separate ZAD builder** - comprehensive brief goes to standard `builder-app.json`
      - Uses `wtaf_zero_admin_collaborative` database table

#### Does it need an admin link?
   • Detects data collection patterns like forms, surveys, signups that require owner management
   • Data flows FROM users TO business owner
   • If yes: create two-part Builder Prompt:
      - Public page (user-facing form)
      - Admin page (data management dashboard) 
      - Split pages using `<!-- WTAF_ADMIN_PAGE_STARTS_HERE -->` delimiter
      - Uses `wtaf_submissions` database table

#### ELSE (General Apps)
   • `wtaf-processor.ts` sends `builder-app.json` (system prompt) + `app-tech-spec.json` (WTAF design system) to Builder GPT

## Builder GPT Creates the App or Game

**Implementation**:
- Games: Use `builder-game.json` with higher creativity (GPT-4o, temp 0.8)
- ZAD Apps: Use `builder-app.json` + comprehensive product brief from classifier + WTAF Cookbook
- Email Apps: Use `builder-app.json` + email placeholder system
- Data Collection: Use `builder-app.json` + dual-page admin system
- Standard Apps: Use `builder-app.json` + WTAF Cookbook injection (fallback)
- All apps: Include coach personality if specified

**Database Integration**:
- WTAF content: Saved to `wtaf_content` table via `storage-manager.ts`
- Form submissions: Saved to `wtaf_submissions` table  
- ZAD collaboration: Saved to `wtaf_zero_admin_collaborative` table

**Post-Processing**:
- OpenGraph image generation via `generate-og-cached` API
- SMS notification via `notification-client.ts`
- File cleanup and archiving via `file-watcher.ts`