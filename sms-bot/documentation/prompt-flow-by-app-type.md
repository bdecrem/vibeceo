# Prompt Flow Documentation by App Type

This document traces the complete prompt flow for each type of app in the WEBTOYS system, showing all components that get combined to create the final instructions sent to the builder LLM.

**METHODOLOGY**: This analysis was done by tracing actual code execution paths through `controller.ts` → `wtaf-processor.ts` → `callClaude()`, not by making assumptions.

**📚 RELATED DOCUMENTATION**: For detailed technical documentation on the classifier and routing system, see: `sms-bot/engine/CLAUDE.md`

## Overview

All apps follow this high-level flow:
1. **User Input** → SMS message received
2. **Image Enhancement** → Parse image references, fetch URLs, enhance prompt  
3. **Classification/Routing** → Determine app type and routing
4. **Builder Selection** → Choose appropriate builder template
5. **Prompt Assembly** → Combine all components into final prompt
6. **LLM Generation** → Send to builder LLM for HTML generation

---

## 1. Web Pages (Standard Apps)

**Trigger**: Default classification OR `--webpage` flag
**Builder**: `builder-app.json`
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: Original SMS message (cleaned of flags)
- **Image Enhancement**: ✅ `USER'S UPLOADED IMAGES TO INCLUDE` section with exact URLs
- **WTAF Design System**: ✅ `app-tech-spec.json` loaded as "WTAF DESIGN SYSTEM & STYLE GUIDE"
- **Builder Instructions**: `builder-app.json` with comprehensive image handling instructions
- **Classification Output**: Email collection flag, app type determination from classifier
- **Coach Personality**: Coach-specific instructions if coach selected
- **Override Processing**: `WEBPAGE_MARKER` → `APP_TYPE: web_page` if `--webpage` used
- **Request Type**: `'app'` (qualifies for WTAF Design System injection)

---

## 2. Admin Pages (Forms/Data Collection)

**Trigger**: Classifier detects `APP_TYPE: data_collection` OR `--admin` flag
**Builder**: `builder-admin-technical.json` 
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: Original SMS message (extracted from `ADMIN_DUAL_PAGE_REQUEST:`)
- **Image Enhancement**: ✅ `USER'S UPLOADED IMAGES TO INCLUDE` section with exact URLs
- **WTAF Design System**: ✅ `app-tech-spec.json` loaded separately for admin requests
- **Classification Output**: `ADMIN_DUAL_PAGE_REQUEST` with full classifier analysis
- **Admin Builder Instructions**: `builder-admin-technical.json` - Dual-page generation patterns
- **Coach Personality**: Coach-specific instructions if coach selected
- **Request Type**: `'app'` (but excluded from standard WTAF Design System injection due to `ADMIN_DUAL_PAGE_REQUEST` check)

---

## 3. Games

**Trigger**: Game keywords detected by `utilsDetectRequestType()` 
**Builder**: `builder-game.json`
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: Original SMS message
- **Image Enhancement**: ✅ `USER'S UPLOADED IMAGES TO INCLUDE` section with exact URLs
- **WTAF Design System**: ❌ **NOT INCLUDED** - Games have `requestType = 'game'`, condition requires `'app'`
- **Builder Instructions**: `builder-game.json` - Mobile HTML5 game generation patterns
- **Game Configuration**: Higher temperature (0.8), game-specific prompting
- **Coach Personality**: Coach-specific instructions if coach selected
- **Request Type**: `'game'` (disqualifies from WTAF Design System injection)

---

## 4. Music Apps

**Trigger**: `--music` flag OR classifier detects music
**Builder**: `builder-music.txt`
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: Original SMS message (full expanded prompt, not just clean request)
- **Image Enhancement**: ✅ `USER'S UPLOADED IMAGES TO INCLUDE` section with exact URLs  
- **WTAF Design System**: ✅ `app-tech-spec.json` loaded (not excluded from condition)
- **Music Marker Processing**: `MUSIC_MARKER` → `MUSIC_APP_REQUEST: ...`
- **Music Builder Instructions**: `builder-music.txt` - Music-specific generation patterns
- **Coach Personality**: Coach-specific instructions if coach selected
- **Request Type**: `'app'` (qualifies for WTAF Design System injection)

---

## 5. Memes

**Trigger**: Classifier detects `APP_TYPE: meme`, returns `MEME_BYPASS_SIGNAL`
**Builder**: `meme-processor.ts` (direct microservice, not LLM builder)
**Route**: `controller.ts` → `meme-processor.ts` (bypasses `wtaf-processor.ts`)

### Prompt Components Combined:
- **User Input**: Original SMS message (passed to meme processor)
- **Image Enhancement**: ❌ **BYPASSED** - Memes skip normal prompt flow entirely
- **WTAF Design System**: ❌ **BYPASSED** - Direct processing, no builder
- **Meme Processing**: GPT-4o for text generation + DALL-E 3 for image generation
- **Direct HTML Generation**: Meme processor creates HTML directly
- **Coach Personality**: ❌ **NOT INCLUDED** - Bypasses builder system
- **Routing Signal**: `MEME_BYPASS_SIGNAL:` triggers direct processor call

---

## 6. ZAD Apps (Zero Admin Data)

**Trigger**: Classifier detects `ZERO_ADMIN_DATA: true` OR ZAD flags
**Builder**: `builder-zad-comprehensive.txt`
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: ❌ **CLEAN REQUEST ONLY** - Enhanced prompt with images gets stripped in parsing
- **Image Enhancement**: ❌ **LOST** - `ZAD_COMPREHENSIVE_REQUEST:` regex extracts only clean user request
- **WTAF Design System**: ❌ **EXPLICITLY EXCLUDED** - `!userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:')`
- **ZAD Builder Instructions**: `builder-zad-comprehensive.txt` - Multi-user app patterns
- **Database Helpers**: `/api/zad/save` and `/api/zad/load` usage patterns
- **Coach Personality**: Coach-specific instructions if coach selected  
- **Request Type**: `'app'` (but explicitly excluded from WTAF Design System)

---

## 7. Public Apps

**Trigger**: `PUBLIC` command from operator+ role
**Builder**: `builder-zad-public.txt`
**Route**: `controller.ts` → `wtaf-processor.ts` → `callClaude()`

### Prompt Components Combined:
- **User Input**: ❌ **CLEAN REQUEST ONLY** - Enhanced prompt with images gets stripped in parsing
- **Image Enhancement**: ❌ **LOST** - `ZAD_PUBLIC_REQUEST:` regex extracts only clean user request
- **WTAF Design System**: ❌ **EXPLICITLY EXCLUDED** - `!userPrompt.includes('ZAD_PUBLIC_REQUEST:')`
- **Public Builder Instructions**: `builder-zad-public.txt` - Public-facing app patterns
- **Role Validation**: Operator/admin role requirement verification
- **Coach Personality**: Coach-specific instructions if coach selected
- **Request Type**: `'app'` (but explicitly excluded from WTAF Design System)

---

## CORRECTED Key Findings

### ✅ **Apps With FULL Image Support:**
1. **Web Pages** - Images ✅ + `app-tech-spec.json` ✅ + `builder-app.json` image instructions ✅
2. **Admin Pages** - Images ✅ + `app-tech-spec.json` ✅ + dual-page generation ✅  
3. **Music Apps** - Images ✅ + `app-tech-spec.json` ✅ + `builder-music.txt` ❌ (no image instructions in `.txt` builder)

### ⚠️ **Apps With PARTIAL Image Support:**
4. **Games** - Images ✅ + NO `app-tech-spec.json` ❌ + `builder-game.json` image instructions ✅

### ❌ **Apps With NO Image Support:**
5. **Memes** - Bypasses entire prompt flow, direct processor
6. **ZAD Apps** - Images stripped during `ZAD_COMPREHENSIVE_REQUEST:` parsing  
7. **Public Apps** - Images stripped during `ZAD_PUBLIC_REQUEST:` parsing

## WTAF Design System Distribution

**✅ INCLUDES `app-tech-spec.json`:**
- Web Pages (via standard injection)
- Admin Pages (via special admin injection)  
- Music Apps (via standard injection)

**❌ EXCLUDES `app-tech-spec.json`:**
- Games (`requestType = 'game'` doesn't qualify)
- Memes (bypasses builder system)
- ZAD Apps (explicitly excluded)
- Public Apps (explicitly excluded)

## Technical Root Causes

### **Image URL Loss in ZAD/Public Apps:**
```javascript
// Problem: Regex extraction loses enhanced prompt
const requestMatch = userPrompt.match(/ZAD_COMPREHENSIVE_REQUEST:\s*(.+)/);
builderUserPrompt = requestMatch[1].trim(); // Only clean request, images lost!
```

### **WTAF Design System Exclusion Logic:**
```javascript
// Only apps meeting ALL conditions get app-tech-spec.json
if (config.designSystem && 
    requestType === 'app' &&  // Games fail here
    !userPrompt.includes('ZAD_PUBLIC_REQUEST:') && 
    !userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:') && 
    !userPrompt.includes('ADMIN_DUAL_PAGE_REQUEST:')) // But admin gets separate injection
```

---

## Prompt Assembly Flow (CORRECTED)

```
User SMS → Image Enhancement → Classification → Builder Selection → Final Prompt

Components by App Type:
├── Web Pages: User + Images + app-tech-spec + builder-app.json + Classification
├── Admin Pages: User + Images + app-tech-spec + builder-admin.json + Classification  
├── Games: User + Images + builder-game.json (NO app-tech-spec)
├── Music Apps: User + Images + app-tech-spec + builder-music.txt
├── Memes: User → Direct to meme-processor.ts (NO builder)
├── ZAD Apps: User only + builder-zad.txt (images & app-tech-spec lost)
└── Public Apps: User only + builder-zad-public.txt (images & app-tech-spec lost)
```

This analysis reveals significant inconsistencies in image support and design system distribution across app types.