# AccessIQ Platform — Quick Start Launch Script
# This PowerShell script automates the full platform startup
# Usage: .\start-platform.ps1

# Configuration
$PLATFORM_ROOT = "C:\Users\21624\web-a11y-platform"
$BACKEND_PORT = 8002
$DASHBOARD_PORT = 3000
$RABBITMQ_PORT = 5672

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       AccessIQ Platform — Full Stack Launch                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Phase 1: Check Docker
Write-Host "[1/4] Checking Docker daemon..." -ForegroundColor Yellow
try {
    $dockerStatus = docker ps -q 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker command failed: $_" -ForegroundColor Red
    exit 1
}

# Phase 2: Start infrastructure
Write-Host ""
Write-Host "[2/4] Starting infrastructure services (Postgres, Redis, RabbitMQ, MinIO)..." -ForegroundColor Yellow
Push-Location $PLATFORM_ROOT
docker compose -f infra/docker/docker-compose.yml up -d
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Infrastructure services started" -ForegroundColor Green

# Wait for RabbitMQ to be ready
Write-Host ""
Write-Host "[2b/4] Waiting for RabbitMQ to be ready..." -ForegroundColor Yellow
$attempts = 0
$maxAttempts = 30
while ($attempts -lt $maxAttempts) {
    $connection = Test-NetConnection -ComputerName localhost -Port $RABBITMQ_PORT -InformationLevel Quiet 2>&1
    if ($connection) {
        Write-Host "✅ RabbitMQ is ready" -ForegroundColor Green
        break
    }
    $attempts++
    Write-Host "  Waiting... (attempt $attempts/$maxAttempts)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if ($attempts -eq $maxAttempts) {
    Write-Host "⚠️  RabbitMQ is not responding yet, but continuing..." -ForegroundColor Yellow
}

# Phase 3: Start Backend
Write-Host ""
Write-Host "[3/4] Starting Backend API (FastAPI on port $BACKEND_PORT)..." -ForegroundColor Yellow
$backendProcess = Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd '$PLATFORM_ROOT\backend'; `
   .\.venv\Scripts\Activate.ps1; `
   uvicorn app.main:app --reload --port $BACKEND_PORT" `
  -PassThru

Write-Host "✅ Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green
Start-Sleep -Seconds 3

# Verify backend health
$attempts = 0
$maxAttempts = 10
while ($attempts -lt $maxAttempts) {
    try {
        $health = curl "http://127.0.0.1:$BACKEND_PORT/health" -UseBasicParsing -ErrorAction Stop
        if ($health.StatusCode -eq 200) {
            Write-Host "✅ Backend is healthy" -ForegroundColor Green
            break
        }
    } catch {
        $attempts++
        if ($attempts -lt $maxAttempts) {
            Write-Host "  Waiting for backend to be ready... (attempt $attempts/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
    }
}

# Phase 4: Start Dashboard
Write-Host ""
Write-Host "[3b/4] Starting Web Dashboard (Next.js on port $DASHBOARD_PORT)..." -ForegroundColor Yellow
$dashboardProcess = Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd '$PLATFORM_ROOT\apps\web-dashboard'; `
   npm run dev -- -p $DASHBOARD_PORT" `
  -PassThru

Write-Host "✅ Dashboard started (PID: $($dashboardProcess.Id))" -ForegroundColor Green
Start-Sleep -Seconds 3

# Phase 5: Start Scanner Worker
Write-Host ""
Write-Host "[4/4] Starting Scanner Worker (RabbitMQ consumer)..." -ForegroundColor Yellow
$scannerProcess = Start-Process powershell -ArgumentList `
  "-NoExit", `
  "-Command", `
  "cd '$PLATFORM_ROOT\apps\scanner-service'; `
   npm run dev" `
  -PassThru

Write-Host "✅ Scanner Worker started (PID: $($scannerProcess.Id))" -ForegroundColor Green

# Final summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    🚀 Platform is Running! 🚀                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   • Dashboard:        http://localhost:$DASHBOARD_PORT" -ForegroundColor White
Write-Host "   • Backend API:      http://127.0.0.1:$BACKEND_PORT" -ForegroundColor White
Write-Host "   • RabbitMQ Admin:   http://localhost:15672 (user: a11y_user, pwd: a11y_password)" -ForegroundColor White
Write-Host "   • MinIO Console:    http://localhost:9001 (user: a11y_user, pwd: a11y_password)" -ForegroundColor White
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "   • Backend Process ID:  $($backendProcess.Id)" -ForegroundColor White
Write-Host "   • Dashboard Process ID: $($dashboardProcess.Id)" -ForegroundColor White
Write-Host "   • Scanner Process ID:   $($scannerProcess.Id)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   • To stop everything: Close the PowerShell windows (Ctrl+C in each)" -ForegroundColor White
Write-Host "   • Docker stays running after script ends (docker compose down to stop)" -ForegroundColor White
Write-Host "   • Check DEPLOYMENT_CHECKLIST.md for detailed validation steps" -ForegroundColor White
Write-Host ""
Write-Host "Next: Open http://localhost:$DASHBOARD_PORT in your browser!" -ForegroundColor Green
