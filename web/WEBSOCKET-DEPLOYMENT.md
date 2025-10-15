# WebSocket Server Deployment Guide for Railway

This guide explains how to deploy the WebSocket server (required for Interactive Mode in the music player) on Railway.

## Problem

The Interactive Mode feature in the music player requires a WebSocket proxy server (`ws-server.js`) that connects the client to OpenAI's Realtime API. However, Railway services can only expose ONE public port per service.

## Solution: Create a Separate Railway Service

The best approach is to create a dedicated Railway service for the WebSocket server.

### Step 1: Create a New Railway Service

1. In your Railway project dashboard, click **"New Service"**
2. Select **"Deploy from GitHub repo"**
3. Choose the same repository but configure it differently

### Step 2: Configure the WebSocket Service

In Railway, configure the new service with these settings:

#### Build Configuration
```
Root Directory: web
Build Command: (leave empty - no build needed)
Start Command: npm run start:ws
```

#### Environment Variables
Set these environment variables for the WebSocket service:
- `NODE_ENV=production`
- `OPENAI_API_KEY=your_openai_api_key_here`
- `WS_PORT=3001` (optional, defaults to 3001)
- `PORT=3001` (Railway will use this for the public port)

### Step 3: Get the WebSocket Service URL

1. Once deployed, Railway will give you a URL like: `ws-service-name-production.railway.app`
2. Note this URL - you'll need it for the web service configuration

### Step 4: Update Web Service Environment Variables

In your main web service (the one running Next.js), add this environment variable:

```
NEXT_PUBLIC_WS_URL=wss://your-ws-service-url.railway.app
```

**Important**: Use `wss://` (secure WebSocket) for production, not `ws://`

### Step 5: Deploy Both Services

1. Deploy the WebSocket service first
2. Then deploy/redeploy the web service with the updated `NEXT_PUBLIC_WS_URL`

## Alternative: Single Service with Concurrently (NOT RECOMMENDED)

While we've set up `concurrently` to run both servers in the same service, **this will NOT work on Railway** because:
- Railway only exposes ONE port per service
- The WebSocket server on port 3001 won't be accessible from the internet
- Only the Next.js server (on Railway's `PORT`) will be publicly accessible

This setup is useful for **local development only**.

## Testing Locally

For local development, both servers run automatically:

```bash
npm run dev
# This runs both server.js (Next.js) and ws-server.js (WebSocket)
```

The client will automatically connect to `ws://localhost:3001`

## Verifying the Setup

Once deployed:

1. Open your music player at `/music-player`
2. Play an AI Daily episode to completion
3. Click the "Interactive Mode" button
4. Check the browser console - you should see WebSocket connection logs
5. If it fails, check:
   - WebSocket service is running (check Railway logs)
   - `NEXT_PUBLIC_WS_URL` is set correctly on web service
   - `OPENAI_API_KEY` is set correctly on WebSocket service

## Troubleshooting

### "Cannot connect to WebSocket server (port 3001)"
- The WebSocket service isn't deployed or isn't running
- Check Railway logs for the WebSocket service

### "WebSocket connection error"
- Check that `NEXT_PUBLIC_WS_URL` uses `wss://` (secure) not `ws://`
- Verify the URL is correct (no trailing slash)

### "Server configuration error"
- The `OPENAI_API_KEY` is missing on the WebSocket service
- Check environment variables in Railway dashboard

## Cost Considerations

Running two Railway services means:
- Each service consumes resources separately
- Consider Railway's pricing for multiple services
- The WebSocket service is lightweight and only uses resources when clients connect

## Security Notes

- The WebSocket server only proxies to OpenAI's API
- It requires an OpenAI API key (set via environment variable)
- No sensitive data is stored
- Each client connection creates a new OpenAI session
