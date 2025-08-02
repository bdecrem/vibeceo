# SMS Bot Deployment Documentation

## Overview
This document serves as the source of truth for all production-related configuration and deployment processes for the SMS bot service.

## Railway Configuration

### Service Name
- **Service**: `smsbot`
- **Environment**: `production`

### Build Configuration
- **Builder**: Docker (uses `sms-bot/Dockerfile`)
- **Node Version**: 20 (specified in Dockerfile: `FROM node:20-bullseye`)

### Required Environment Variables
```bash
# Core APIs
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
TOGETHER_API_KEY=<your-key>

# Twilio Configuration
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_PHONE_NUMBER=<your-number>

# Supabase
SUPABASE_URL=<your-url>
SUPABASE_SERVICE_KEY=<your-service-key>
SUPABASE_ANON_KEY=<your-anon-key>

# Email (SendGrid)
SENDGRID_API_KEY=<your-key>
SENDGRID_LIST_ID=<your-list-id>

# HTML/CSS API (for OG images)
HTMLCSS_USER_ID=<your-user-id>
HTMLCSS_API_KEY=<your-api-key>

# Application URLs
WEB_APP_URL=https://www.advisorsfoundry.ai

# System
NODE_ENV=production
PORT=3030
```

### Health Check
- **Endpoint**: `/health`
- **Expected Response**: 200 OK

## Dependencies

### Critical Package Versions
- **Node.js**: 20.x (required by rimraf 6.0.1 and other dependencies)
- **Twilio**: 5.8.0
- **Axios**: 1.11.0

### Package Management
- Uses npm workspaces (managed from root `package.json`)
- SMS bot has its own `package-lock.json` in `sms-bot/` directory
- Build command: `npm install` followed by `npm run build`

## Dockerfile Details

The SMS bot uses a custom Dockerfile that:
1. Installs Node.js 20 with Python support
2. Installs Node dependencies
3. Builds TypeScript
4. Installs Python dependencies for monitoring scripts
5. Runs the production startup script

Key file: `sms-bot/Dockerfile`

## Startup Process

1. **Entry Point**: `./start-production-typescript.sh`
2. **What it does**:
   - Starts the SMS bot server (port 3030)
   - Launches the WTAF engine (TypeScript)
   - Monitors file directories for processing

## Common Issues & Solutions

### Issue: Package-lock.json out of sync
**Symptom**: `npm ci` fails with missing dependencies
**Solution**: 
- Ensure `sms-bot/package-lock.json` is up to date
- Run `cd sms-bot && npm install` locally and commit changes

### Issue: Node version mismatch
**Symptom**: `EBADENGINE` errors during build
**Solution**: 
- Update Dockerfile to use Node 20: `FROM node:20-bullseye`
- Ensure no conflicting Node version specifications

### Issue: Build cache problems
**Symptom**: Railway uses old dependencies despite updates
**Solution**: 
- Add a cache-busting comment to force rebuild
- Or manually trigger deployment with cache clear in Railway dashboard

## Monitoring & Logs

- Logs available via Railway CLI: `railway logs --service smsbot`
- Key log indicators:
  - "SMS bot started successfully"
  - "SMS bot service listening on port 3030"
  - "WTAF Engine running with worker pool"

## Architecture Notes

The SMS bot follows a microservices architecture:
- **Controller**: Business logic orchestration
- **Storage Manager**: All database operations
- **Processors**: AI/LLM interactions
- **Worker Pool**: Concurrent file processing

See `CLAUDE.md` for detailed architecture rules.

## Deployment Checklist

- [ ] All environment variables set in Railway
- [ ] Dockerfile specifies correct Node version
- [ ] package-lock.json is current
- [ ] No uncommitted changes to dependencies
- [ ] Health check endpoint responding
- [ ] Logs show successful startup

## Last Updated
August 2, 2025 - Fixed Node 20 deployment issues, removed outdated web/package-lock.json