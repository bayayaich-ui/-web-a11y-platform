# AccessIQ Platform — Complete Deployment & End-to-End Validation Checklist

This document provides the exact commands and validation steps to bring the full platform online and confirm all services work together correctly.

---

## Phase 1: Start Infrastructure Services

### Prerequisites
- Docker Desktop or Docker daemon must be running
- All ports (5432, 6379, 5672, 15672, 9000, 9001, 8002, 3000/3002) must be available

### Step 1a: Start all backing services
```powershell
cd C:\Users\21624\web-a11y-platform
docker compose -f infra/docker/docker-compose.yml up -d postgres redis rabbitmq minio
```

**Expected output:**
```
Creating a11y-postgres ... done
Creating a11y-redis ... done
Creating a11y-rabbitmq ... done
Creating a11y-minio ... done
```

### Step 1b: Verify all services are running
```powershell
docker compose -f infra/docker/docker-compose.yml ps
```

**Expected result:** All containers must show `Up` status.

```
NAME              IMAGE                      COMMAND                  STATUS
a11y-postgres     postgres:16-alpine         "docker-entrypoint..."   Up 2 seconds
a11y-redis        redis:7-alpine             "redis-server"           Up 2 seconds
a11y-rabbitmq     rabbitmq:3-management-... "docker-entrypoint..."   Up 2 seconds
a11y-minio        minio/minio:latest         "minio server /data..."  Up 2 seconds
```

### Step 1c: Verify port connectivity (optional but recommended)
```powershell
# Check PostgreSQL
Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet

# Check Redis
Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet

# Check RabbitMQ AMQP
Test-NetConnection -ComputerName localhost -Port 5672 -InformationLevel Quiet

# Check RabbitMQ Management UI
Test-NetConnection -ComputerName localhost -Port 15672 -InformationLevel Quiet

# Check MinIO API
Test-NetConnection -ComputerName localhost -Port 9000 -InformationLevel Quiet

# Check MinIO Console
Test-NetConnection -ComputerName localhost -Port 9001 -InformationLevel Quiet
```

**Expected:** All should return `True`.

---

## Phase 2: Start Application Services

### Step 2a: Backend (FastAPI) — in a new PowerShell terminal
```powershell
cd C:\Users\21624\web-a11y-platform\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8002
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8002 (Press CTRL+C to quit)
INFO:     Application startup complete
```

**Verify health:**
```powershell
curl http://127.0.0.1:8002/health -UseBasicParsing
```

Expected response: `{"status":"ok"}` (or similar 200 OK)

---

### Step 2b: Web Dashboard (Next.js) — in a new PowerShell terminal
```powershell
cd C:\Users\21624\web-a11y-platform\apps\web-dashboard
npm run dev
```

**Expected output:**
```
  ▲ Next.js 16.x.x
  - Local:        http://localhost:3000
  ...
  ✓ Ready in 2.5s
```

**Verify health:**
```powershell
curl http://127.0.0.1:3000/api/health -UseBasicParsing
```

Expected response: `200 OK` with health status

---

### Step 2c: Scanner Worker — in a new PowerShell terminal
```powershell
cd C:\Users\21624\web-a11y-platform\apps\scanner-service
npm run dev
```

**Expected output:**
```
[scanner-service] Connecting to RabbitMQ (amqp://a11y_user:a11y_password@localhost:5672) attempt #1
[scanner-service] Connected to RabbitMQ
[scanner-service] Starting queue consumer...
[scanner-service] Listening for scan jobs on queue: scan.jobs
```

**If RabbitMQ connection fails:** The worker will retry indefinitely with exponential backoff (1s → 2s → 4s → 8s → 16s → 30s → repeat). This is expected if RabbitMQ is slow to start. The worker will connect automatically when RabbitMQ becomes ready.

---

## Phase 3: Verify Core Application Routes

### Step 3a: Test Backend API Routes (in any terminal)

**1. Check health:**
```powershell
curl http://127.0.0.1:8002/health -UseBasicParsing
```

**2. Create a test site:**
```powershell
$body = @{
    name = "Example Test Site"
    url = "https://example.com"
    scan_mode = "full"
} | ConvertTo-Json

$response = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/sites" `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing

$response | ConvertFrom-Json
```

**Expected response:**
```json
{
  "id": 1,
  "name": "Example Test Site",
  "url": "https://example.com",
  "scan_mode": "full",
  "created_at": "2026-09-06T...",
  "updated_at": "2026-09-06T..."
}
```

**3. List sites:**
```powershell
curl http://127.0.0.1:8002/api/v1/sites -UseBasicParsing | ConvertFrom-Json
```

**Expected:** Array of sites including the one just created.

### Step 3b: Test Frontend Routes (in browser or via curl)

**1. Dashboard home:**
```
http://localhost:3000/
```

**2. Sites list:**
```
http://localhost:3000/sites
```

**3. Login (if auth is enabled):**
```
http://localhost:3000/login
```

All pages should load without 404 or 500 errors.

---

## Phase 4: End-to-End Scan Validation

### Step 4a: Trigger a Full-Site Scan (example.com)

**1. Create a site (if not already done):**
```powershell
$body = @{
    name = "Example.com Full Scan Test"
    url = "https://example.com"
    scan_mode = "full"
} | ConvertTo-Json

$siteResponse = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/sites" `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing

$site = $siteResponse | ConvertFrom-Json
$siteId = $site.id

Write-Host "Created site ID: $siteId"
```

**2. Trigger a scan:**
```powershell
$scanBody = @{
    site_id = $siteId
} | ConvertTo-Json

$scanResponse = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/scans" `
  -ContentType "application/json" `
  -Body $scanBody `
  -UseBasicParsing

$scan = $scanResponse | ConvertFrom-Json
$scanId = $scan.id

Write-Host "Created scan ID: $scanId"
Write-Host "Status: $($scan.status)"
```

**Expected response:**
```json
{
  "id": 1,
  "site_id": 1,
  "status": "queued",
  "current_step": "pending",
  "pages_scanned": 0,
  "violations_found": 0,
  "score_global": null,
  "created_at": "2026-09-06T...",
  "updated_at": "2026-09-06T..."
}
```

**3. Monitor the scan in the scanner worker terminal:**

Watch for messages like:
```
Starting scan for site https://example.com (scan_id=1)
Crawling site...
Found X pages
Processing page: https://example.com (page 1/X)
Scan for site example.com completed successfully
Publishing scan completion event
```

**4. Poll scan status until complete:**
```powershell
$scanId = 1  # Replace with actual scan ID from step 2

do {
    Start-Sleep -Seconds 5
    $status = curl "http://127.0.0.1:8002/api/v1/scans/$scanId" -UseBasicParsing | ConvertFrom-Json
    Write-Host "Status: $($status.status) | Pages: $($status.pages_scanned) | Violations: $($status.violations_found)"
} while ($status.status -ne "completed" -and $status.status -ne "completed_with_errors" -and $status.status -ne "failed")

Write-Host "Scan finished!"
Write-Host "Final Status: $($status.status)"
Write-Host "Score: $($status.score_global)"
```

**Expected final states:**
- `completed`: All pages scanned, no errors
- `completed_with_errors`: Partial results preserved (AI quota exhausted, timeout, etc.)
- `failed`: No pages were processed (rare)

---

### Step 4b: Verify Scan Results

**1. Get detailed scan info:**
```powershell
$scanId = 1  # Replace with actual scan ID

curl "http://127.0.0.1:8002/api/v1/scans/$scanId" -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

**Expected fields:**
```json
{
  "id": 1,
  "site_id": 1,
  "status": "completed",
  "pages_scanned": 1,
  "violations_found": 25,
  "score_global": 98,
  "created_at": "...",
  "updated_at": "..."
}
```

**2. Get pages from the scan:**
```powershell
curl "http://127.0.0.1:8002/api/v1/scans/$scanId/pages" -UseBasicParsing | ConvertFrom-Json
```

**Expected:** Array of pages with violations.

**3. Get violations for a specific page:**
```powershell
$pageId = 1  # Get from pages endpoint

curl "http://127.0.0.1:8002/api/v1/pages/$pageId/violations" -UseBasicParsing | ConvertFrom-Json
```

**Expected:** Array of violation objects with:
- `id`
- `violation_type` (e.g., "color-contrast")
- `wcag_level` (e.g., "AA")
- `severity` (e.g., "serious")
- `description`
- `diagnostic` (may be `null` if AI failed, but violation still exists)

---

### Step 4c: Generate and Download Report

**1. Request a report:**
```powershell
$scanId = 1

$reportBody = @{
    scan_id = $scanId
    format = "pdf"  # or "html"
} | ConvertTo-Json

$reportResponse = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/reports" `
  -ContentType "application/json" `
  -Body $reportBody `
  -UseBasicParsing

$report = $reportResponse | ConvertFrom-Json
$reportId = $report.id

Write-Host "Created report ID: $reportId"
Write-Host "Status: $($report.status)"
```

**2. Poll report generation:**
```powershell
do {
    Start-Sleep -Seconds 2
    $status = curl "http://127.0.0.1:8002/api/v1/reports/$reportId" -UseBasicParsing | ConvertFrom-Json
    Write-Host "Report status: $($status.status)"
} while ($status.status -eq "generating")

Write-Host "Report ready!"
Write-Host "Download URL: $($status.file_url)"
```

**3. Download the report:**
```powershell
$reportId = 1

curl "http://127.0.0.1:8002/api/v1/reports/$reportId/download" `
  -OutFile "C:\temp\accessibility-report-$reportId.pdf"

Write-Host "Report saved to C:\temp\accessibility-report-$reportId.pdf"
```

---

## Phase 5: Stress Test & Partial Failure Scenarios

### Step 5a: Large Whole-Site Scan (if bandwidth/quota allows)

**1. Create a more complex site (e.g., iit.tn):**
```powershell
$body = @{
    name = "IIT Tunisia Full Scan"
    url = "https://iit.tn"
    scan_mode = "full"
} | ConvertTo-Json

$siteResponse = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/sites" `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing

$site = $siteResponse | ConvertFrom-Json
$siteId = $site.id
```

**2. Trigger scan and monitor:**
```powershell
$scanBody = @{ site_id = $siteId } | ConvertTo-Json

$scanResponse = curl -Method POST `
  -Uri "http://127.0.0.1:8002/api/v1/scans" `
  -ContentType "application/json" `
  -Body $scanBody `
  -UseBasicParsing

$scan = $scanResponse | ConvertFrom-Json
$scanId = $scan.id

# Monitor in scanner terminal — watch for:
# - Gemini quota 429 errors (expected, violations preserved)
# - Page timeouts (expected, page skipped but others continue)
# - Final status should be "completed_with_errors" with partial results

do {
    Start-Sleep -Seconds 10
    $status = curl "http://127.0.0.1:8002/api/v1/scans/$scanId" -UseBasicParsing | ConvertFrom-Json
    Write-Host "Time: $(Get-Date) | Status: $($status.status) | Pages: $($status.pages_scanned) | Violations: $($status.violations_found)"
} while ($status.status -eq "queued" -or $status.status -eq "in_progress")

Write-Host "Scan finished with status: $($status.status)"
```

**Expected behavior:**
- Scanner logs show page crawls and scans
- Some pages may timeout (logged)
- Some AI diagnostics may fail with 429 (Gemini quota)
- **Violations are preserved even when diagnostics fail**
- Final status is `completed_with_errors` (not `failed`)

---

## Phase 6: Dashboard UI Validation

### Step 6a: Access the dashboard
Open browser and navigate to:
```
http://localhost:3000
```

### Step 6b: Verify core pages load
1. **Home/Dashboard** — should show list of recent scans
2. **Sites** (`/sites`) — should list all created sites
3. **Scans** (`/scans`) — should list all scans with status
4. **Reports** (`/reports`) — should show generated reports
5. **Scan Detail** (`/scans/[id]`) — should show scan info and violations

### Step 6c: Trigger a scan from the UI (if UI supports it)
1. Click "New Scan" or similar
2. Select a site
3. Monitor progress in real-time (if implemented)
4. View results when complete

---

## Phase 7: Cleanup & Troubleshooting

### Stop all services
```powershell
# In each terminal running a service (backend, dashboard, scanner):
# Press Ctrl+C

# Stop Docker containers:
docker compose -f infra/docker/docker-compose.yml down

# Stop and remove all data (if needed):
docker compose -f infra/docker/docker-compose.yml down -v
```

### Troubleshooting

#### RabbitMQ connection fails in scanner worker
**Symptom:** Scanner logs show repeated connection errors.

**Solution:**
1. Verify RabbitMQ is running: `docker compose -f infra/docker/docker-compose.yml ps`
2. Check logs: `docker compose -f infra/docker/docker-compose.yml logs rabbitmq`
3. Worker will auto-retry. No action needed; just wait for RabbitMQ to stabilize.

#### Backend cannot connect to database
**Symptom:** Backend shows `PostgreSQL connection refused`.

**Solution:**
1. Verify Postgres is running: `docker compose -f infra/docker/docker-compose.yml ps`
2. Check backend logs for connection string errors
3. Restart backend service

#### Scanner hangs on a page
**Symptom:** Scanner logs show "Processing page X for 30+ seconds".

**Solution:**
- Expected behavior. Scanner waits up to 30s per page (configurable).
- Page will timeout and be marked as failed.
- Scan continues with next page.

#### Gemini API quota exhausted
**Symptom:** Scanner logs show `429 Too Many Requests` from Gemini.

**Solution:**
- Expected behavior in extended scans.
- Violations are still recorded and persisted.
- Diagnostics are skipped for subsequent pages.
- Scan completes with status `completed_with_errors`.

#### Dashboard shows 404 errors
**Symptom:** UI shows "Page not found" or API errors.

**Solution:**
1. Verify backend is running on port 8002
2. Check CORS settings in backend config
3. Clear browser cache: Ctrl+Shift+Delete
4. Restart Next.js dev server

---

## Success Criteria

✅ **All services up and responding:**
- Backend `/health` returns 200
- Next.js loads home page
- Scanner worker connects to RabbitMQ

✅ **Site CRUD works:**
- Create site via API
- List sites
- Patch site (change name, scan_mode, etc.)
- Delete site

✅ **Scan flow end-to-end:**
- Scan completes with status `completed` or `completed_with_errors`
- Pages are crawled and persisted
- Violations are recorded
- Score is computed

✅ **Partial failure handling:**
- AI diagnostics failure doesn't crash scan
- Page timeouts don't stop other pages
- Results persist even when dependencies fail

✅ **Report generation:**
- Reports are created
- Reports can be downloaded
- Report format is valid (PDF, HTML, etc.)

---

## Performance Expectations

- **Example.com small site:** 5–15 seconds (1 page, quick violations)
- **IIT.tn large site:** 5–30 minutes (50–200 pages, AI diagnostics, potential quota hits)
- **Database write latency:** <100ms per page result
- **Queue publish latency:** <50ms per message
- **AI diagnostic latency:** 1–5 seconds per violation (with retries)

---

## Notes

- **Partial results are a feature, not a bug.** If the scan hits quota or times out mid-way, the pages already processed are saved and the scan is marked `completed_with_errors`, not `failed`.
- **Idempotent operations:** Creating a scan with the same site_id twice creates two separate scan records. This is intended.
- **RabbitMQ durability:** Queue assertions ensure jobs are not lost if the broker restarts.
- **Browser pool concurrency:** Scanner limits concurrent page processing to 3 by default to avoid resource exhaustion.

---

## Contact & Logs

If issues persist, collect logs from:
1. Backend terminal (uvicorn output)
2. Scanner terminal (queue consumer output)
3. Docker logs: `docker compose -f infra/docker/docker-compose.yml logs -f`
4. Browser DevTools (F12 in dashboard)

Good luck! 🚀
