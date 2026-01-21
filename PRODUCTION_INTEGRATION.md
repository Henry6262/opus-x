# Production Integration - Agent Versioning System

**Date:** 2026-01-21
**Status:** ✅ **PRODUCTION READY**

---

## Quick Start

### 1. Enable Analytics Tab

Create `.env.local` in the superRouter directory:

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit with your values
NEXT_PUBLIC_DEVPRINT_API_URL=https://devprint-v2-production.up.railway.app
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access Analytics Dashboard

Navigate to: **http://localhost:3000** → **Smart Trading Dashboard** → **Analytics Tab**

---

## Production API Details

### Base URL
```
https://devprint-v2-production.up.railway.app
```

### Response Format
All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Available Endpoints

#### 1. List All Versions
```http
GET /api/versions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "version_code": "v1.0.0",
      "version_name": "Initial Production Config",
      "config_snapshot": { ... },
      "is_active": true,
      "created_at": "2024-01-21T10:00:00Z"
    }
  ]
}
```

#### 2. Get Active Version
```http
GET /api/versions/active
```

#### 3. Create New Version
```http
POST /api/versions
Content-Type: application/json

{
  "version_code": "v1.1.0",
  "version_name": "Updated Strategy",
  "config_snapshot": { ... },
  "activate": true
}
```

#### 4. Activate Version
```http
PUT /api/versions/{id}/activate
```

#### 5. Get Version Metrics
```http
GET /api/versions/{id}/metrics?start_date=2024-01-01&end_date=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "version_id": "uuid",
      "date": "2024-01-21",
      "total_trades": 10,
      "winning_trades": 7,
      "losing_trades": 3,
      "win_rate": 70.0,
      "total_pnl_sol": 2.5,
      "avg_hold_time_minutes": 120
    }
  ]
}
```

---

## API Client Implementation

### Location
`src/lib/versioning-api.ts`

### Key Features
- ✅ Production URL hardcoded with Railway endpoint
- ✅ Unwraps `{success, data, error}` response format
- ✅ Client-side version comparison (backend doesn't have `/compare` endpoint yet)
- ✅ Error handling for API failures

### Example Usage

```typescript
import { versioningApi } from '@/lib/versioning-api';

// List all versions
const versions = await versioningApi.listVersions();

// Get active version
const active = await versioningApi.getActiveVersion();

// Create new version
const newVersion = await versioningApi.createVersion({
  versionCode: 'v1.2.0',
  versionName: 'My New Strategy',
  configSnapshot: currentConfig,
  activate: true,
});

// Activate a different version
await versioningApi.activateVersion('uuid');

// Get metrics for a version
const metrics = await versioningApi.getVersionMetrics(
  'uuid',
  '2024-01-01',
  '2024-01-31'
);
```

---

## Testing with Production Data

### Current Test Data (Production)
- **Version v1.0.0:** Initial Production Config (active)
- **Version v1.1.0:** Test Version (created for validation)
- **Metrics:** 1 day of data (10 trades, 70% win rate)

### Testing Checklist

1. **Enable Analytics Tab**
   ```bash
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   ```

2. **Verify Version List**
   - Navigate to Analytics tab
   - Should see v1.0.0 and v1.1.0
   - Active version badge should display

3. **Test Version Creation**
   - Click "Create Version" (when UI is added)
   - Fill in form
   - Verify new version appears in list

4. **Test Version Activation**
   - Click "Activate" on a different version
   - Verify active badge moves
   - Check that `/api/trading/stats` reflects new active version

5. **Test Metrics Display**
   - Active version metrics cards should populate
   - Chart should render with lines for each version
   - Table should rank versions correctly

6. **Test Comparison**
   - Select multiple versions
   - Verify chart shows multiple lines
   - Verify summary calculations are correct

---

## Known Limitations

### Backend Limitations (As of 2026-01-21)
1. **No `/api/versions/compare` endpoint** - Frontend does client-side comparison
2. **Limited test data** - Only 1-2 days of metrics available
3. **Single active version** - Only one version can be active at a time (by design)

### Frontend Implementation Notes
- Client-side comparison fetches metrics for each version separately
- May be slower with many versions or large date ranges
- Consider caching or pagination if performance becomes an issue

---

## Error Handling

### Common Errors

**1. Network Error**
```
API Error 500: Internal Server Error
```
**Solution:** Check backend logs, verify Railway deployment is running

**2. Validation Error**
```
API Error 400: version_code is required
```
**Solution:** Check request payload, ensure all required fields are present

**3. Not Found Error**
```
API Error 404: Version not found
```
**Solution:** Verify version ID exists, check database

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_DEVPRINT_API_URL` | No | `https://devprint-v2-production.up.railway.app` | Backend API base URL |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Yes | `false` | Enable analytics tab visibility |

---

## Troubleshooting

### Analytics Tab Not Showing
- Check `NEXT_PUBLIC_ENABLE_ANALYTICS=true` in `.env.local`
- Restart development server after changing env vars

### API Errors
- Verify Railway deployment is running
- Check browser console for detailed error messages
- Verify API URL is correct

### No Data Showing
- Check that versions exist in database
- Verify active version is set
- Check that metrics exist for the date range

### Chart Not Rendering
- Check browser console for React errors
- Verify data format matches TypeScript interfaces
- Check that Recharts is installed (`npm list recharts`)

---

## Next Steps

### When Backend Updates
If backend implements `/api/versions/compare` endpoint:

1. Update `src/lib/versioning-api.ts`:
   ```typescript
   async compareVersions(...) {
     // Replace client-side logic with:
     const params = new URLSearchParams();
     versionIds.forEach(id => params.append('version_ids', id));
     return this.fetch<VersionComparisonData>(`/api/versions/compare?${params}`);
   }
   ```

2. Test that server-side comparison returns same format
3. Remove client-side summary calculation logic

---

## Performance Considerations

### Current Implementation
- Client-side comparison: O(n) API calls (n = number of versions)
- Each call fetches metrics for date range
- No caching implemented yet

### Optimization Opportunities
1. Add client-side caching for metrics
2. Implement pagination for large date ranges
3. Use React Query or SWR for automatic background updates
4. Add WebSocket support for real-time metric updates

---

## Documentation Links

- **Frontend Status:** `use-case-apps/superRouter/FRONTEND_STATUS.md`
- **Backend Status:** `use-case-apps/devprint/BACKEND_STATUS.md`
- **API Contracts:** `use-case-apps/devprint/PRODUCTION_API_VERSIONING.md` (if available)

---

**Production deployment verified on 2026-01-21**
**Frontend ready for end-to-end testing**
