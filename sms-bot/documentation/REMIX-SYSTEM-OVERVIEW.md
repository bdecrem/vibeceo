# WEBTOYS Remix System Overview

This document describes how the remix functionality works for different types of WEBTOYS applications.

## What is Remix?

Remix allows users to modify existing WEBTOYS applications by providing new instructions. The system automatically detects the app type and applies the appropriate remix logic.

## Remix Commands

Users can trigger remix functionality through:
- **SMS**: `REMIX [app-slug] [instructions]`
- **Web**: `wtaf --remix [app-slug] [instructions]` or `--remix [app-slug] [instructions]`

## App Types and Remix Logic

### 1. Normal Web Pages
- **App Type**: `web`
- **System Prompt**: `remix-gpt-prompt.txt`
- **Method**: Sends HTML of original app + user requirements to remix LLM
- **Storage**: Only stores the user's remix request

### 2. Web Pages with Forms (needsAdmin)
- **App Type**: `needsAdmin`
- **System Prompt**: `remix-gpt-prompt.txt`
- **Method**: Sends HTML of original app + user requirements to remix LLM
- **Storage**: Only stores the user's remix request
- **Note**: Preserves form functionality and admin capabilities

### 3. Single Data Collection Pages (oneThing)
- **App Type**: `oneThing`
- **System Prompt**: `remix-gpt-prompt.txt`
- **Method**: Sends HTML of original app + user requirements to remix LLM
- **Storage**: Only stores the user's remix request
- **Examples**: Email collection, waitlists, contact forms

### 4. Games
- **App Type**: `games` (stored as `GAME` in database)
- **System Prompt**: `remix-games-prompt.txt`
- **Method**: Sends HTML of original game + user requirements to remix LLM
- **Special Handling**: Preserves JavaScript game logic to prevent breaking functionality
- **Storage**: Only stores the user's remix request

### 5. CRUD/Collaborative Apps (ZAD)
- **App Type**: `ZAD`
- **System Prompt**: `builder-zad-comprehensive.txt`
- **Method**: **Regenerates from scratch** using combined prompts
- **Enhanced Prompt Format**: `The user is requesting that you do this: "${originalPrompt}" and added "${userRequest}"`
- **Storage**: Updates prompt field with modification tracking: `${originalPrompt}. modification ${modificationNumber}: ${userRequest}`
- **Special Features**:
  - Can request up to 8192 tokens (vs standard limit)
  - Maintains multi-user collaborative functionality
  - Preserves ZAD helper functions and API integration

### 6. Memes
- **App Type**: `MEME`
- **Method**: **Regenerates entirely** using new prompt
- **Process**: Calls meme processor with remix instructions
- **Storage**: Creates new meme with remix metadata
- **Special Features**:
  - Uses GPT-4o for new meme text generation
  - Creates new DALL-E 3 image based on remix request
  - Tracks original meme in metadata for attribution
  - Preserves social graph relationships

## Key Differences

### HTML-Based Remix (Types 1-4)
- Uses existing HTML as base
- Modifies the current implementation
- Faster and more predictable
- Good for visual/content changes

### Prompt-Based Regeneration (Types 5-6 - ZAD & Memes)
- Regenerates entire app/meme from prompts
- More flexible for structural changes
- ZAD: Maintains prompt lineage for tracking
- Memes: Creates entirely new content based on remix request
- Better for functional modifications and creative reinterpretation

## Technical Implementation

### File Locations
- **Remix Logic**: `sms-bot/engine/controller.ts` (lines 584-753)
- **Remix Functions**: `sms-bot/engine/stackables-manager.ts`
  - `parseRemixCommand()` - Parses user input
  - `buildRemixPrompt()` - Creates prompt for HTML-based remix
  - `buildGameRemixPrompt()` - Creates prompt for game remix
- **System Prompts**:
  - `sms-bot/content/remix-gpt-prompt.txt` - Standard web pages
  - `sms-bot/content/remix-games-prompt.txt` - Games
  - `sms-bot/content/builder-zad-comprehensive.txt` - ZAD apps

### Permissions
- Regular users can only remix their own apps
- Elevated roles (coder/degen/operator/admin) can remix ANY app
- Role hierarchy: admin > operator > degen > coder

### Social Features
After successful remix:
- Creates parent-child relationship in `wtaf_app_lineage` table
- Updates remix counts for both users
- Tracks generation level (how many remixes deep)
- Original creator attribution is preserved

## Error Handling

Common failure scenarios:
- `remix-parse`: Invalid command format
- `remix-not-found`: Target app doesn't exist
- `remix-permission`: User lacks permission to remix
- `remix-original-prompt`: Can't load original prompt (ZAD only)
- `remix-unsupported`: Unknown remix command format
- `meme-generation`: Meme remix generation failed

## Best Practices

1. **For Visual Changes**: Use standard remix on web/form pages
2. **For Game Tweaks**: Be specific about what to change (e.g., "make the player move faster")
3. **For ZAD Apps**: Understand that the entire app will be regenerated
4. **For Memes**: Provide clear direction for the new meme (e.g., "make it about cats instead")
5. **Attribution**: Always preserved - remixes show original creator

## Future Considerations

- Potential for selective HTML element targeting
- Version control/rollback capabilities
- Remix chains visualization
- Enhanced meme remix with style transfer options