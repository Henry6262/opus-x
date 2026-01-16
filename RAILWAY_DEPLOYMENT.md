# Deploy Birdeye Proxy to Railway

This guide shows how to deploy the Birdeye WebSocket proxy to Railway (same as devprint).

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway

## Deployment Steps

### 1. Create New Railway Project
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repository: `Henry6262/opus-x`
5. Select the `main` branch

### 2. Configure Root Directory
Since the proxy is in `use-case-apps/SuperRouter`:
1. In Railway project settings
2. Go to "Settings" → "Service Settings"
3. Set **Root Directory**: `use-case-apps/SuperRouter`

### 3. Set Environment Variables
Add these in Railway project → Variables:

```bash
# Required
BIRDEYE_API_KEY=cf82010007474bafafed60ce74a85550
BIRDEYE_PROXY_PORT=8081

# Optional - Redis (if you want caching)
USE_REDIS=false
# REDIS_URL=<your-railway-redis-url>
# REDIS_PASSWORD=<your-redis-password>
```

### 4. Deploy
Railway will automatically:
- Detect the `Procfile` or `railway.json`
- Install dependencies with `npm install`
- Start the proxy with: `node --require tsx/cjs src/server/birdeye-proxy.ts`

### 5. Get Your WebSocket URL
After deployment:
1. Railway will give you a URL like: `birdeye-proxy-production.up.railway.app`
2. Your WebSocket URL will be: `wss://birdeye-proxy-production.up.railway.app`

### 6. Configure Vercel Environment Variables
In your Vercel project (SuperRouter):
1. Go to Settings → Environment Variables
2. Add:
   - **Name**: `NEXT_PUBLIC_BIRDEYE_WS_URL`
   - **Value**: `wss://your-railway-url.up.railway.app`
   - **Environment**: Production (and Preview if needed)

### 7. Test the Connection
```bash
# Test with wscat
wscat -c "wss://your-railway-url.up.railway.app?chain=solana"

# You should see:
# Connected
# {"type":"PROXY_CONNECTED","message":"Connected to Birdeye (API key secured)"}
```

## Local Development
For local development, keep using:
```bash
# In .env.local
NEXT_PUBLIC_BIRDEYE_WS_URL=ws://localhost:8081

# Run locally:
npm run ws:proxy
```

## Monitoring
- **Railway Dashboard**: Check logs and metrics
- **Health Check**: `https://your-railway-url.up.railway.app/health`

## Troubleshooting

### "Invalid protocol" error
- Check that `BIRDEYE_API_KEY` is set correctly in Railway
- Verify the API key is valid and has WebSocket access

### Connection refused
- Check Railway deployment logs
- Ensure `BIRDEYE_PROXY_PORT` is set to 8081
- Verify the service is running

### CORS issues
- The proxy doesn't need CORS (WebSocket doesn't use it)
- If you see CORS errors, check your Next.js app config

## Architecture
```
Browser (Vercel) → Railway Proxy → Birdeye API
     ↓                    ↓              ↓
NEXT_PUBLIC_         birdeye-       wss://public-api
BIRDEYE_WS_URL      proxy.ts        .birdeye.so
```

## Cost
Railway free tier includes:
- $5/month free credits
- This proxy uses minimal resources (~$1-2/month)
