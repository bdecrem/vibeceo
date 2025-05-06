# Project Root Directory Rules

## Important: Project Has Two Root Directories

This project has two distinct root directories that should be used depending on which part of the project you're working on:

### 1. Website Root
```
/vibeceo8/web/
```
- Use this root when working on the Next.js website
- Contains: pages, components, API routes, and website-specific code
- All website-related paths should be relative to this directory

### 2. Discord Bot Root
```
/vibeceo8/discord-bot/
```
- Use this root when working on the Discord bot
- Contains: bot logic, handlers, and Discord-specific code
- All Discord bot-related paths should be relative to this directory

## Usage Guidelines

1. **When Working on Website**:
   - Always use `/vibeceo8/web/` as the root
   - All imports and file paths should be relative to this directory
   - Example: `import { Component } from '@/components/Component'`

2. **When Working on Discord Bot**:
   - Always use `/vibeceo8/discord-bot/` as the root
   - All imports and file paths should be relative to this directory
   - Example: `import { handler } from './lib/discord/handlers'`

3. **Shared Resources**:
   - Some resources are shared between both parts
   - These should be referenced using the appropriate root for the context
   - Example: 
     - Website: `import { type } from '../../../discord-bot/types'`
     - Bot: `import { type } from '../types'`

## Important Notes

- Never mix roots - stick to one root directory per context
- When using Cursor or other tools, make sure you're in the correct root directory
- If you're unsure which root to use, check which part of the project you're working on
- The root directory affects how imports and file paths are resolved

## Common Confusion Points

1. **File Paths**:
   - Website paths start from `/vibeceo8/web/`
   - Bot paths start from `/vibeceo8/discord-bot/`
   - Don't mix these paths

2. **Import Statements**:
   - Website imports are relative to `/vibeceo8/web/`
   - Bot imports are relative to `/vibeceo8/discord-bot/`
   - Use the correct relative paths

3. **Configuration Files**:
   - Website configs are in `/vibeceo8/web/`
   - Bot configs are in `/vibeceo8/discord-bot/`
   - Keep configurations in their respective roots