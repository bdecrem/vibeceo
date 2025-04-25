# Discord Bot Deployment Guide

## Source of Truth: package.json
Always refer to `package.json` for the correct commands:
- Local development: `npm run start:bot:dev`
  ```json
  "start:bot:dev": "npm run build:bot && node dist/scripts/start-discord-bot.js"
  ```
- Production deployment: `npm run start:bot:prod`
  ```json
  "start:bot:prod": "NODE_ENV=production node dist/scripts/start-discord-bot.js"
  ```
- Build command: `npm run build:bot`
  ```json
  "build:bot": "tsc -p tsconfig.bot.json"
  ```

Railway automatically:
- Runs `npm install` (which triggers `postinstall` script)
- Uses `start:bot:prod` to run the bot

## Railway CLI Setup

### One-Time Setup
1. Install Railway CLI:
   ```bash
   brew install railway
   ```
2. Login to Railway:
   ```bash
   railway login
   ```
3. Link to the project:
   ```bash
   railway link
   ```
4. Verify connection:
   ```bash
   railway status
   ```

### Quick Deploy Commands
- Deploy changes:
  ```bash
  railway up
  ```
- Restart service:
  ```bash
  railway down && railway up
  ```
- View logs:
  ```bash
  railway logs
  ```

## Permanent Development Settings

### ESLint Configuration (.eslintrc.js)
The following relaxed ESLint rules are permanently configured and automatically respected by both Cursor and Railway:
```javascript
module.exports = {
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'off',
    'no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off'
  }
};
```

This configuration:
1. Is version controlled and automatically applied
2. Doesn't need to be mentioned to Cursor - it's always aware of these rules
3. Works seamlessly with Railway deployments
4. Allows using `any` types and skipping strict checks when needed

You never need to:
- Remind Cursor about these rules
- Modify deployment settings for Railway
- Worry about ESLint blocking deployments

## Development Process

### 1. Before Making Changes
- Work on a feature branch, not main
- Test changes locally first
- Verify the build works locally with `npm run build:bot`
- **Important**: When adding new files or imports, use `.js` extensions in import statements
  ```typescript
  // Correct (with .js extension)
  import { someFunction } from './utils.js';
  
  // Incorrect (will fail in production)
  import { someFunction } from './utils';
  ```

### 2. Before Merging to Main
- Double-check all imports have `.js` extensions
- Make sure TypeScript compilation works
- Test the production command locally: `npm run start:bot:prod`
- Verify all environment variables are properly set in Railway

### 3. After Merging to Main
- Do a clean Railway deployment:
  ```bash
  railway down
  railway up
  ```
- Monitor the logs to ensure it starts correctly
- Verify the bot connects to Discord
- Check that scheduled tasks (watercooler, news, etc.) are running

### 4. If Something Goes Wrong
- We can quickly revert to the last working commit
- We won't be stuck debugging in production
- Check Railway logs for ES module or import-related errors
- Verify all file extensions in import statements

## Common Issues

### ES Module Imports
Since we use ES modules (`"type": "module"` in package.json):
- All TypeScript imports must use `.js` extensions
- This applies even when importing `.ts` files
- The extension in the import statement should be `.js`, not `.ts`

### Environment Variables
- Make sure all required environment variables are set in Railway
- Local testing should use `.env.local`
- Never commit environment files

### Build Process
- The build process uses `tsconfig.bot.json`
- Outputs to `dist/` directory
- `dist/` is git-ignored
- Railway runs the build automatically on deploy

## Deployment Checklist

- [ ] All imports use `.js` extensions
- [ ] TypeScript compiles without errors
- [ ] Local production test passes
- [ ] Environment variables set in Railway
- [ ] Clean Railway deployment performed
- [ ] Bot connects successfully
- [ ] Scheduled tasks running
- [ ] Logs show no ES module errors

## Development Guidelines

### TypeScript and ESLint Configuration
We use a balanced approach to type checking and linting that maintains safety while reducing friction:

#### TypeScript Configuration (tsconfig.bot.json)
```json
{
  "compilerOptions": {
    // Safety-critical settings
    "strict": true,
    "noImplicitAny": true,
    
    // Development helpers
    "noImplicitReturns": false,
    "allowUnreachableCode": true,
    "skipLibCheck": true,
    
    // Required for our setup
    "module": "es2022",
    "forceConsistentCasingInFileNames": true
  }
}
```

#### ESLint Configuration (.eslintrc.js)
```javascript
module.exports = {
  rules: {
    // Safe to relax
    'no-console': 'off',  // We use console for logging
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    
    // Keep strict for Discord bot safety
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    
    // Development convenience (warnings)
    'no-debugger': 'warn',
    'no-duplicate-imports': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn'
  }
}
```

This configuration balances:
1. Type safety for Discord API interactions
2. Strict typing for CEO/character system
3. Development speed and convenience
4. Protection against common Discord.js pitfalls

Key principles:
- Keep type safety for critical bot operations
- Allow console logging for our logging system
- Warn instead of error for development conveniences
- Maintain strict typing where it matters most

For temporary type bypasses in development:
```typescript
// Use these sparingly and only in non-critical code
// @ts-ignore
// or
/* eslint-disable @typescript-eslint/no-explicit-any */
```

## Critical Build Requirements
These settings are essential for successful builds and deployments:
1. ES Modules Configuration:
   ```json
   // package.json
   {
     "type": "module"
   }
   ```
   ```json
   // tsconfig.bot.json
   {
     "module": "es2022"
   }
   ```
2. Import Statements:
   - Must use `.js` extensions
   - Example: `import { handler } from './utils.js';`

These are NOT optional - they're required for the build to work.

## Development Convenience Settings
These settings make development easier but don't affect build success:
- Relaxed ESLint rules in `.eslintrc.js`
- Using `any` types when needed
- Disabling specific TypeScript checks 