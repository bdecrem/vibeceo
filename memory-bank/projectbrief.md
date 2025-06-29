# Project Brief: VibeCEO Platform

## Core Mission
Create a multi-interface platform where 6 fictional AI personas inhabit a comedic startup universe, providing mostly hilarious "advice" to real entrepreneurs while operating their own fictional startup incubator that actually builds real apps through the WTAF system.

## The Fictional Universe
**Setting:** A parody startup ecosystem where 6 AI CEO personas run "VibeAccelerator" - a fictional incubator that's simultaneously incompetent and surprisingly effective.

**Tone:** Comedy-first approach to business advice, with AI personas that have distinct personalities, quirks, and running gags while occasionally delivering genuinely useful insights.

## Primary Components

### 1. SMS Bot Infrastructure 
- **Port:** 3030
- **Function:** Receives SMS messages, processes WTAF commands, manages user interactions
- **Key Features:** WTAF code generation, CEO coaching, user management via Supabase, daily Inspirations messages
- **File Processing:** Saves prompts to `data/wtaf/` for TypeScript engine processing

### 2. Discord Bot
- **Function:** Discord server where the 6 CEO personas interact with users and each other
- **Key Features:** Story mode adventures, interactive pitch reviews, direct chat with individual coaches, "For Real" serious conversations, watercooler banter between personas
- **Unique Element:** CEOs have automated conversations every 15 minutes, creating an living fictional universe
- **Integration:** Shares CEO personality data with other platforms

### 3. Web Platform
- **Main Site:** Parody coaching interface featuring the 6 CEO personas
- **WTAF Chat:** Web interface for code generation (recently implemented)
- **Architecture:** Next.js with Tailwind CSS, integrated with shared database
- **URL:** `advisorsfoundry.ai`

### 4. TypeScript Engine System 
- **Function:** Processes saved prompts, generates HTML pages, saves to database
- **Output:** Creates live pages at `wtaf.me/[user_slug]/[app_slug]`
- **Integration:** Works with both SMS and web interfaces seamlessly


### 5. Database (Supabase)
- **Tables:** `sms_subscribers`, `wtaf_content` 
- **Function:** User management, generated page storage, cross-platform data sharing
- **Integration:** Unified data layer for SMS, Discord, and Web platforms

## The 6 CEO Personas
The fictional characters that power the VibeAccelerator universe:

1. **Chad** - Overly confident tech bro with questionable advice
2. **Jennifer** - Corporate consultant with buzzword addiction  
3. **Marcus** - Serial entrepreneur with wild success stories
4. **Dr. Sarah** - Academic turned founder with research obsessions
5. **Roberto** - International business guru with cultural insights
6. **Alex** - Young prodigy with unconventional wisdom

*Each persona has distinct personality traits, speech patterns, and areas of "expertise" that create comedy through their interactions.*

## Current User Base
- **SMS users:** Various permission levels (coder, user, admin) for WTAF generation
- **Discord users:** Community members engaging with CEO personas and stories
- **Web users:** Visitors seeking coaching and app generation services

## Key URLs
- `wtaf.me/[user_slug]/[app_slug]` - Generated apps and tools
- `wtaf.me/[user_slug]/chat` - Web chat interface for WTAF
- `advisorsfoundry.ai` - Main parody coaching website

## Platform Integration
**Unified Comedy Universe:** All platforms (SMS, Discord, Web) feature the same 6 CEO personas with consistent personalities and shared fictional universe continuity.

**Technical Integration:** 
- Shared database for user management and content
- Common CEO personality data across platforms
- Unified WTAF generation system accessible via multiple interfaces
- Cross-platform notifications and updates

## Recent Major Addition
**WTAF Web Chat Interface** - Alternative to SMS for code generation, maintains full infrastructure compatibility while providing enhanced UX with clickable links and real-time progress visualization. 