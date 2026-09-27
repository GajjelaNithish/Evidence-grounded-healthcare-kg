# stop_all.ps1 — Cleanly stops all ClinicalKG services

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

Write-Host "Stopping all ClinicalKG services..." -ForegroundColor Cyan

# Set JAVA_HOME
$JdkDir = Join-Path $ProjectRoot "tools\jdk"
$JdkSubdir = Get-ChildItem -Path $JdkDir -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($JdkSubdir) {
    $env:JAVA_HOME = $JdkSubdir.FullName
} else {
    $env:JAVA_HOME = $JdkDir
}

# 1. Stop Celery
Write-Host "[1/5] Stopping Celery..." -ForegroundColor Yellow
taskkill /F /IM celery.exe /T 2>$null
Get-Process -Name "celery" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Stop Uvicorn / FastAPI
Write-Host "[2/5] Stopping Uvicorn..." -ForegroundColor Yellow
taskkill /F /IM uvicorn.exe /T 2>$null
Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Stop Redis
Write-Host "[3/5] Stopping Redis..." -ForegroundColor Yellow
$RedisCli = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\redis") -Filter "redis-cli.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
if ($RedisCli) {
    & $RedisCli shutdown 2>$null
}
taskkill /F /IM redis-server.exe /T 2>$null
Get-Process -Name "redis-server" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 4. Stop Neo4j
Write-Host "[4/5] Stopping Neo4j..." -ForegroundColor Yellow
$Neo4jBat = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\neo4j") -Filter "neo4j.bat" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
if ($Neo4jBat) {
    & $Neo4jBat stop 2>$null
}
# Also kill java processes running from the jdk directory if console mode was used
Get-Process -Name "java" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        if ($_.Path -and $_.Path.StartsWith($env:JAVA_HOME)) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# 5. Stop PostgreSQL
Write-Host "[5/5] Stopping PostgreSQL..." -ForegroundColor Yellow
$PgCtl = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\postgres") -Filter "pg_ctl.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
$PgData = Join-Path $ProjectRoot "tools\postgres\data"
if ($PgCtl -and (Test-Path $PgData)) {
    & $PgCtl -D "$PgData" stop 2>$null
}

Write-Host "All services stopped." -ForegroundColor Green
