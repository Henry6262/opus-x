# SuperRouter - Railway WebSocket Deployment Guide

> **Complete documentation for deploying and managing SuperRouter's WebSocket infrastructure on Railway**

## Overview

SuperRouter uses **two separate Railway WebSocket servers** for different purposes:

1. **Birdeye Proxy** (`ws-proxy-production`) - Solana price feeds via Birdeye API
2. **devprint** (`devprint-production`) - Trading WebSocket server

Both servers are deployed independently on Railway and serve different parts of the application.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [WebSocket Servers](#websocket-servers)
3. [Redis Integration](#redis-integration)
4. [Deployment Steps](#deployment-steps)
5. [Environment Variables](#environment-variables)
6. [Deployment History](#deployment-history)
7. [Testing & Monitoring](#testing--monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPERROUTER ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │   Browser    │                                               │
│  │  (Vercel)    │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ├─── NEXT_PUBLIC_BIRDEYE_WS_URL ────────────┐          │
│         │                                             │          │
│         └─── NEXT_PUBLIC_DEVPRNT_CORE_URL ──────┐   │          │
│                                                  │   │          │
│  ┌──────────────────────────────────────────┐  │   │          │
│  │         RAILWAY INFRASTRUCTURE            │  │   │          │
│  │                                           │  │   │          │
│  │  ┌─────────────────────────────────┐    │  │   │          │
│  │  │  1. BIRDEYE PROXY               │◄───┼──┘   │          │
│  │  │  ws-proxy-production-3724       │    │      │          │
│  │  │  Port: 8081                     │    │      │          │
│  │  │  URL: wss://ws-proxy-...        │    │      │          │
│  │  │                                 │    │      │          │
│  │  │  Purpose:                       │    │      │          │
│  │  │  - Solana token price feeds     │    │      │          │
│  │  │  - Birdeye API WebSocket proxy  │    │      │          │
│  │  │  - Hides API key server-side    │    │      │          │
│  │  │                                 │    │      │          │
│  │  │  Connects to:                   │    │      │          │
│  │  │  wss://public-api.birdeye.so    │    │      │          │
│  │  └─────────────────────────────────┘    │      │          │
│  │                                          │      │          │
│  │  ┌─────────────────────────────────┐    │      │          │
│  │  │  2. DEVPRINT SERVER             │◄───┼──────┘          │
│  │  │  devprint-production            │    │                 │
│  │  │  URL: wss://devprint-...        │    │                 │
│  │  │                                 │    │                 │
│  │  │  Purpose:                       │    │                 │
│  │  │  - Trading WebSocket server     │    │                 │
│  │  │  - Smart trading features       │    │                 │
│  │  │  - Trade signals & operations   │    │                 │
│  │  └─────────────────────────────────┘    │                 │
│  │                                          │                 │
│  │  ┌─────────────────────────────────┐    │                 │
│  │  │  3. REDIS (Optional)            │    │                 │
│  │  │  redis-production               │    │                 │
│  │  │                                 │    │                 │
│  │  │  Purpose:                       │    │                 │
│  │  │  - WebSocket connection caching │    │                 │
│  │  │  - Multi-client pub/sub         │    │                 │
│  │  │  - Price data caching           │    │                 │
│  │  └─────────────────────────────────┘    │                 │
│  └──────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## WebSocket Servers

### 1. Birdeye Proxy (`ws-proxy-production`)

**Purpose:** Proxies Birdeye API WebSocket connections to hide API key from browser

**Deployed URL:** `wss://ws-proxy-production-3724.up.railway.app`

**Source Code:** `src/server/birdeye-proxy.ts`

**Features:**
- WebSocket proxy for Birdeye API
- Server-side API key management
- Token price subscriptions (Solana chain)
- Health check endpoint (`/health`)
- Optional Redis caching for multi-client support

**Used By:**
- `SmartTradingContext.tsx` - Real-time token price updates
- Trading dashboard price feeds

**Port:** 8081

---

### 2. devprint Trading Server (`devprint-production`)

**Purpose:** Trading WebSocket server for smart trading features

**Deployed URL:** `wss://devprint-production.up.railway.app/ws/trading`

**Features:**
- Trading signals and operations
- Smart trading features
- Real-time trade updates

**Used By:**
- Trading components
- Smart trading dashboard

---

## Redis Integration

### Setup Redis on Railway (Optional but Recommended)

Redis enables multi-client WebSocket broadcasting and caching.

**Why Redis?**
- Cache Birdeye API responses across multiple browser clients
- Reduce API calls and costs
- Enable pub/sub for multi-client WebSocket updates
- Improve performance and reliability

**Setup Steps:**

1. **Create Redis Service in Railway**
   ```
   Railway Dashboard → New → Database → Add Redis
   ```

2. **Get Redis Connection Details**
   - Railway will auto-generate `REDIS_URL` and `REDIS_PASSWORD`
   - Copy these values from the Redis service Variables tab

3. **Add to Birdeye Proxy Environment Variables**
   ```bash
   USE_REDIS=true
   REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379
   REDIS_PASSWORD=xxxxx
   ```

4. **Redis Features in birdeye-proxy.ts**
   - Connection caching
   - Price data caching (5-minute TTL)
   - Pub/sub for broadcasting to multiple clients

**Without Redis:**
- Set `USE_REDIS=false`
- Each browser client gets direct Birdeye connection
- No caching, no multi-client optimization

---

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway (`Henry6262/opus-x`)
- Birdeye API key

---

## Deployment Steps

### Deploying Birdeye Proxy

#### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose repository: `Henry6262/opus-x`
5. Select branch: `main`

#### Step 2: Configure Root Directory

⚠️ **Important:** Since SuperRouter is in a subdirectory:

1. Railway Project → **Settings** tab
2. Under **Source**, set **Root Directory**: `use-case-apps/SuperRouter`
3. This ensures Railway builds from the correct location

#### Step 3: Configure Port Mapping

Railway auto-exposes port 8080, but our proxy uses 8081:

1. Go to **Settings** → **Networking**
2. Under **Public Networking**, find **Target Port**
3. Change from `8080` to **`8081`**
4. Click **Update**

#### Step 4: Set Healthcheck Path

1. Scroll to **Healthcheck Path** section
2. Enter: `/health`
3. This endpoint returns `{"status":"ok"}` when proxy is healthy

#### Step 5: Configure Build Settings

Railway will automatically detect the `Dockerfile` in the root of SuperRouter:

- **Builder**: Dockerfile (auto-detected)
- **Build Command**: `true` (set in railway.json)
- **Start Command**: `node --require tsx/cjs --import tsx/esm src/server/birdeye-proxy.ts`

No manual configuration needed - Railway uses the custom Dockerfile.

#### Step 6: Add Environment Variables

Go to **Variables** tab and add:

```bash
# Required
BIRDEYE_API_KEY=cf82010007474bafafed60ce74a85550
BIRDEYE_PROXY_PORT=8081
NODE_ENV=production

# Redis (Optional - set to false if not using)
USE_REDIS=false
```

**With Redis** (recommended):
```bash
USE_REDIS=true
REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379
REDIS_PASSWORD=xxxxx
```

#### Step 7: Deploy

Railway will automatically:
1. Use the custom `Dockerfile`
2. Install all dependencies (including `tsx`)
3. Copy only necessary files (`src/server/`)
4. Start the WebSocket proxy on port 8081

Watch the deploy logs for:
```
✅ Birdeye WebSocket Proxy Server running on port 8081
```

#### Step 8: Get Your WebSocket URL

After successful deployment:

1. Go to **Settings** → **Networking** → **Public Networking**
2. Click **Generate Domain** (if not auto-generated)
3. Your URL will be: `ws-proxy-production-3724.up.railway.app`
4. WebSocket URL: `wss://ws-proxy-production-3724.up.railway.app`

#### Step 9: Configure Vercel Environment Variables

Update your Vercel project (SuperRouter frontend):

1. Go to Vercel Dashboard → SuperRouter project
2. **Settings** → **Environment Variables**
3. Add/Update:
   - **Name**: `NEXT_PUBLIC_BIRDEYE_WS_URL`
   - **Value**: `wss://ws-proxy-production-3724.up.railway.app`
   - **Environments**: Production ✅ (and Preview if needed)
4. Click **Save**
5. **Redeploy** your Vercel app to apply changes

---

## Environment Variables

### SuperRouter Frontend (Vercel)

```bash
# Birdeye WebSocket (Railway Proxy)
NEXT_PUBLIC_BIRDEYE_WS_URL=wss://ws-proxy-production-3724.up.railway.app

# Trading WebSocket (devprint on Railway)
NEXT_PUBLIC_DEVPRNT_CORE_URL=https://devprint-production.up.railway.app

# Other configs
NEXT_PUBLIC_PONZINOMICS_API_URL=http://localhost:4001
PONZINOMICS_API_KEY=test_dev_key_12345
GEMINI_API_KEY=AIzaSyAb8RN6IK5KAQsd_nwBqZf6tHCSiRazSfXseHBpN0TKyUuHVLBQ
```

### Birdeye Proxy (Railway)

```bash
# Required
BIRDEYE_API_KEY=cf82010007474bafafed60ce74a85550
BIRDEYE_PROXY_PORT=8081
NODE_ENV=production

# Redis (Optional)
USE_REDIS=false  # or true with Redis URL/password
REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379
REDIS_PASSWORD=xxxxx
```

### Local Development (.env.local)

```bash
# Use localhost for local development
NEXT_PUBLIC_BIRDEYE_WS_URL=ws://localhost:8081
NEXT_PUBLIC_DEVPRNT_CORE_URL=https://devprint-production.up.railway.app

# To run proxy locally:
# npm run ws:proxy
# or: node --require tsx/cjs src/server/birdeye-proxy.ts
```

---

## Deployment History

### What We Built & Why

#### Problem 1: Browser Security - Can't Expose API Keys

**Issue:**
- Birdeye API requires an API key for WebSocket connections
- Can't put API key in frontend code (exposed in browser)
- Need server-side proxy to hide the key

**Solution:**
- Built `src/server/birdeye-proxy.ts` - WebSocket proxy server
- Browser connects to proxy, proxy connects to Birdeye with API key
- API key stays secure on server side

#### Problem 2: Railway Build Failures

**Issues Encountered:**

1. **Next.js Cache Mount Conflicts** (Jan 16, 2026)
   - Railway auto-detected Next.js and created cache mounts
   - Cache mounts for `tsconfig.tsbuildinfo` conflicted with existing file
   - Error: `"not a directory"` mount error

   **Fix:** Created custom `Dockerfile` to bypass Nixpacks auto-detection

2. **Missing tsx Module** (Jan 16, 2026)
   - Used `npm ci --only=production` which skipped devDependencies
   - `tsx` was in devDependencies but needed for runtime TypeScript
   - Error: `Cannot find module 'tsx/cjs'`

   **Fix:** Changed Dockerfile to `npm ci` (install all dependencies)

3. **Wrong Port Exposed** (Jan 16, 2026)
   - Railway defaulted to port 8080
   - Proxy listens on port 8081
   - Connections failed

   **Fix:** Manually configured Railway target port to 8081

#### Current Deployment

**Date:** January 16, 2026

**Status:** ✅ Successfully Deployed

**Components:**
- Custom Dockerfile (bypasses Nixpacks)
- Node.js 20-slim base image
- Port 8081 exposed and configured
- Health check on `/health` endpoint
- Environment variables configured
- Public domain generated

**Files Modified:**
- `Dockerfile` - Custom build configuration
- `railway.json` - Railway deployment config
- `.railwayignore` - Exclude Next.js artifacts
- `nixpacks.toml` - Nixpacks configuration (not used with Dockerfile)
- `Procfile` - Process definition (not used with Dockerfile)

---

## Testing & Monitoring

### Health Check Verification

After deployment, verify the proxy is running:

```bash
# Test health endpoint
curl https://ws-proxy-production-3724.up.railway.app/health

# Expected response:
{"status":"ok"}
```

### WebSocket Connection Testing

**Using wscat (Command Line):**
```bash
# Install wscat globally
npm install -g wscat

# Test WebSocket connection
wscat -c wss://ws-proxy-production-3724.up.railway.app

# Once connected, send a subscription message:
{"type":"SUBSCRIBE_PRICE","data":{"address":"So11111111111111111111111111111111111111112","chain":"solana"}}

# You should receive price updates
```

**Using Browser Console:**
```javascript
// Open browser console and paste:
const ws = new WebSocket('wss://ws-proxy-production-3724.up.railway.app');

ws.onopen = () => {
  console.log('✅ Connected to Birdeye proxy');
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE_PRICE',
    data: {
      address: 'So11111111111111111111111111111111111111112',
      chain: 'solana'
    }
  }));
};

ws.onmessage = (event) => {
  console.log('📊 Price update:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ Error:', error);
};
```

### Local Development

For local development, keep using:

```bash
# In .env.local
NEXT_PUBLIC_BIRDEYE_WS_URL=ws://localhost:8081
NEXT_PUBLIC_DEVPRNT_CORE_URL=https://devprint-production.up.railway.app

# Run proxy locally:
npm run ws:proxy

# Or directly:
node --require tsx/cjs src/server/birdeye-proxy.ts
```

**Local Testing:**
```bash
# Terminal 1: Start proxy
npm run ws:proxy

# Terminal 2: Test connection
wscat -c ws://localhost:8081

# Send test message
{"type":"SUBSCRIBE_PRICE","data":{"address":"So11111111111111111111111111111111111111112","chain":"solana"}}
```

### Monitoring Railway Deployment

**View Logs:**
1. Go to Railway Dashboard → Your Project
2. Click on the `ws-proxy-production` service
3. Click **Logs** tab
4. Look for: `✅ Birdeye WebSocket Proxy Server running on port 8081`

**Check Metrics:**
1. Railway Dashboard → Service → **Metrics** tab
2. Monitor:
   - CPU usage (should be low, <10%)
   - Memory usage (should be <100MB)
   - Network traffic (increases with active connections)

**Health Check Status:**
1. Railway Dashboard → Service → **Settings** → **Networking**
2. Scroll to **Health Check**
3. Status should show: ✅ Healthy

### Production Frontend Testing

After deploying to Vercel with updated environment variables:

1. **Open SuperRouter App** (your Vercel deployment)
2. **Navigate to Trading Dashboard**
3. **Open Browser DevTools** → Console
4. **Look for WebSocket logs:**
   - `WebSocket connection opened`
   - Price updates streaming

5. **Check Network Tab:**
   - Filter: WS (WebSocket)
   - Should see connection to `wss://ws-proxy-production-3724.up.railway.app`
   - Status: 101 Switching Protocols

---

## Troubleshooting

### Deployment Issues

#### "Invalid protocol" Error
**Symptom:** Railway logs show `Error: Invalid protocol`

**Causes:**
- `BIRDEYE_API_KEY` not set in Railway environment variables
- API key is invalid or expired

**Fix:**
1. Go to Railway → Service → **Variables**
2. Verify `BIRDEYE_API_KEY` is set correctly
3. Test the key directly with Birdeye API
4. Redeploy the service

---

#### "Connection Refused" or "ECONNREFUSED"
**Symptom:** Cannot connect to WebSocket

**Causes:**
- Port misconfiguration (Railway exposing 8080 instead of 8081)
- Service not running
- Firewall/network issue

**Fix:**
1. **Check Port Configuration:**
   - Railway → Service → **Settings** → **Networking**
   - **Target Port** must be `8081` (not 8080)

2. **Verify Service is Running:**
   - Check **Logs** for: `Birdeye WebSocket Proxy Server running on port 8081`

3. **Check Health Endpoint:**
   ```bash
   curl https://ws-proxy-production-3724.up.railway.app/health
   ```

---

#### "Cannot find module 'tsx/cjs'" Error
**Symptom:** Railway deploy succeeds but crashes at runtime

**Cause:** `tsx` is in `devDependencies` but needed for runtime TypeScript execution

**Fix:** Already fixed in `Dockerfile` - using `npm ci` instead of `npm ci --only=production`

**Verify Fix:**
```dockerfile
# Dockerfile should have:
RUN npm ci  # NOT npm ci --only=production
```

---

#### "Not a directory" Build Error
**Symptom:** Railway build fails with cache mount error for `tsconfig.tsbuildinfo`

**Cause:** Nixpacks auto-detects Next.js and creates Docker cache mounts that conflict with existing files

**Fix:** Already fixed with custom `Dockerfile` that bypasses Nixpacks

**Verify Fix:**
- `Dockerfile` exists in project root
- Railway uses Dockerfile (not Nixpacks)
- Build logs show: `Using Detected Dockerfile`

---

### Runtime Issues

#### WebSocket Connection Drops
**Symptom:** Connection established but then closes

**Possible Causes:**
1. **Railway timeout** - Railway has 55-second idle timeout
2. **Birdeye API limits** - Too many connections
3. **Network issues**

**Fix:**
- Implement heartbeat/ping in proxy (already implemented in birdeye-proxy.ts)
- Monitor Railway logs for disconnection reasons
- Consider using Redis for connection pooling

---

#### "Invalid API Key" from Birdeye
**Symptom:** Proxy connects but Birdeye rejects API key

**Fix:**
1. Verify `BIRDEYE_API_KEY` in Railway Variables
2. Check API key status at Birdeye dashboard
3. Ensure key has WebSocket access enabled

---

#### No Price Updates Received
**Symptom:** Connection works but no data

**Possible Causes:**
1. Invalid token address
2. Token not on Solana chain
3. Birdeye API issue

**Fix:**
- Test with known token: `So11111111111111111111111111111111111111112` (SOL)
- Check Birdeye API status
- Verify subscription message format

---

### Frontend Integration Issues

#### "Mixed Content" Error (HTTP/HTTPS)
**Symptom:** Browser blocks WebSocket connection

**Cause:** Trying to connect to `ws://` from `https://` page

**Fix:** Always use `wss://` (secure WebSocket) for production
```bash
# Vercel environment variable should be:
NEXT_PUBLIC_BIRDEYE_WS_URL=wss://ws-proxy-production-3724.up.railway.app
# NOT ws://
```

---

#### "WebSocket connection to ... failed"
**Symptom:** Browser can't establish connection

**Debug Steps:**
1. **Check URL in browser console:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_BIRDEYE_WS_URL);
   ```

2. **Verify environment variable:**
   - Vercel → Settings → Environment Variables
   - Should be: `wss://ws-proxy-production-3724.up.railway.app`

3. **Redeploy Vercel:**
   - Environment variable changes require redeployment
   - Vercel → Deployments → Redeploy

4. **Test URL directly:**
   ```bash
   wscat -c wss://ws-proxy-production-3724.up.railway.app
   ```

---

## Cost Estimation

**Railway Free Tier:**
- $5/month in credits
- Sufficient for development and testing

**Birdeye Proxy Usage:**
- Minimal CPU (<10%)
- Low memory (~50-100MB)
- Network: Based on WebSocket traffic
- **Estimated:** $1-2/month

**devprint Trading Server:**
- Already deployed, costs unchanged

**Redis (Optional):**
- Railway Redis: ~$5/month
- Recommended for production with multiple users

**Total Estimated Cost:** $1-7/month depending on Redis usage
