# Quick Validation Checklist (TL;DR)

## ✅ Pre-Flight
- [ ] Docker Desktop running (`docker ps -q` returns no errors)
- [ ] All ports free: 5432, 6379, 5672, 15672, 9000, 9001, 8002, 3000

## ✅ Infrastructure Online
```powershell
cd C:\Users\21624\web-a11y-platform
docker compose -f infra/docker/docker-compose.yml up -d postgres redis rabbitmq minio
docker compose -f infra/docker/docker-compose.yml ps  # All should be "Up"
```

## ✅ Services Started (each in new PowerShell terminal)

### Terminal 1: Backend
```powershell
cd C:\Users\21624\web-a11y-platform\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8002
# Verify: http://127.0.0.1:8002/health → 200 OK
```

### Terminal 2: Dashboard
```powershell
cd C:\Users\21624\web-a11y-platform\apps\web-dashboard
npm run dev
# Verify: http://localhost:3000 → loads (no 404)
```

### Terminal 3: Scanner Worker
```powershell
cd C:\Users\21624\web-a11y-platform\apps\scanner-service
npm run dev
# Verify: Logs show "Connected to RabbitMQ" + "Listening for scan jobs"
```

## ✅ Smoke Test (Core Routes)

### Backend Health
```powershell
curl http://127.0.0.1:8002/health -UseBasicParsing
# Expected: 200 OK, {"status":"ok"} or similar
```

### Create Test Site
```powershell
$body = @{name="Test Site"; url="https://example.com"; scan_mode="full"} | ConvertTo-Json
curl -Method POST http://127.0.0.1:8002/api/v1/sites `
  -ContentType "application/json" -Body $body -UseBasicParsing | ConvertFrom-Json
# Expected: site object with id, name, url, scan_mode
```

### List Sites
```powershell
curl http://127.0.0.1:8002/api/v1/sites -UseBasicParsing | ConvertFrom-Json
# Expected: array of sites
```

## ✅ End-to-End Scan (Full Test)

### 1. Capture Site ID
```powershell
$sites = curl http://127.0.0.1:8002/api/v1/sites -UseBasicParsing | ConvertFrom-Json
$siteId = $sites[0].id
Write-Host "Testing scan for site ID: $siteId"
```

### 2. Trigger Scan
```powershell
$body = @{site_id=$siteId} | ConvertTo-Json
$scan = curl -Method POST http://127.0.0.1:8002/api/v1/scans `
  -ContentType "application/json" -Body $body -UseBasicParsing | ConvertFrom-Json
$scanId = $scan.id
Write-Host "Scan ID: $scanId | Status: $($scan.status)"
```

### 3. Monitor Progress (in Scanner Terminal)
Watch for:
- ✅ "Starting scan for site..."
- ✅ "Crawling site..." + "Found X pages"
- ✅ "Processing page..." messages
- ✅ "Publishing scan completion" (at end)

### 4. Poll Until Complete
```powershell
$scanId = 1  # Use actual scan ID from step 2

do {
    Start-Sleep -Seconds 5
    $status = curl "http://127.0.0.1:8002/api/v1/scans/$scanId" `
      -UseBasicParsing | ConvertFrom-Json
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] Status: $($status.status) | Pages: $($status.pages_scanned) | Violations: $($status.violations_found) | Score: $($status.score_global)"
} while ($status.status -match "queued|in_progress")

Write-Host ""
Write-Host "✅ Scan Completed!"
Write-Host "   Status: $($status.status)"
Write-Host "   Pages Scanned: $($status.pages_scanned)"
Write-Host "   Violations Found: $($status.violations_found)"
Write-Host "   Global Score: $($status.score_global)"
```

### 5. Verify Results
```powershell
$scanId = 1  # Use actual scan ID

# Get scan details
curl "http://127.0.0.1:8002/api/v1/scans/$scanId" -UseBasicParsing | ConvertFrom-Json

# Get pages
curl "http://127.0.0.1:8002/api/v1/scans/$scanId/pages" -UseBasicParsing | ConvertFrom-Json

# Get violations from first page
curl "http://127.0.0.1:8002/api/v1/pages/1/violations" -UseBasicParsing | ConvertFrom-Json
```

**Expected:** Each response is 200 OK with valid JSON data.

## ✅ Dashboard UI Check

1. Open **http://localhost:3000** in browser
2. Navigate to:
   - [ ] Home page loads
   - [ ] `/sites` — Shows created sites
   - [ ] `/scans` — Shows scan history
   - [ ] Scan detail page loads
3. No 404 or 500 errors in console

## ✅ Expected Scan States

- **`completed`** — All pages processed, no external failures
- **`completed_with_errors`** — Partial results saved (quota/timeout/AI failure)
- **`failed`** — Scan did not process any pages (rare, usually infrastructure issue)
- **`queued` → `in_progress`** — Scan is running

## ✅ Partial Failure Handling (Stress Test)

For a large site (e.g., iit.tn with 50+ pages):
- Scanner may hit Gemini quota (429 errors) → violations still saved
- Some pages may timeout → other pages continue
- Expected final status: `completed_with_errors`
- Results should NOT be lost

**Verify in logs:**
- ✅ "429 Too Many Requests" appears but scan continues
- ✅ "Page load timeout" appears but other pages process
- ✅ Scan completes with status `completed_with_errors`

## ✅ Cleanup

```powershell
# Stop all service terminals: Ctrl+C in each PowerShell window

# Stop Docker services:
docker compose -f C:\Users\21624\web-a11y-platform\infra\docker\docker-compose.yml down

# Full clean (remove data):
docker compose -f C:\Users\21624\web-a11y-platform\infra\docker\docker-compose.yml down -v
```

---

## 🔴 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Docker not running | Start Docker Desktop |
| RabbitMQ connection refused | Wait 10s, Docker may be slow. Scanner auto-retries. |
| Backend 404 on `/api/v1/sites` | Restart backend, check port 8002 in use |
| Dashboard shows 404 | Clear browser cache (Ctrl+Shift+Del), refresh |
| Scan stuck at "in_progress" for 30+ min | Likely waiting on external page load. Normal. |
| Scan shows status 500 error | Check backend logs for database/queue error |

---

## Success = All Green ✅

If you can:
1. ✅ Create a site
2. ✅ Trigger a scan
3. ✅ Monitor progress in scanner logs
4. ✅ Scan completes with violations recorded
5. ✅ Dashboard shows results

**→ Platform is fully operational! 🚀**
