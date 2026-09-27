# start_all.ps1 — Starts all ClinicalKG services in order

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

Write-Host "Starting all ClinicalKG services..." -ForegroundColor Cyan

# Set PYTHONPATH to include backend directory
$BackendDir = Join-Path $ProjectRoot "backend"
$env:PYTHONPATH = "$BackendDir;$env:PYTHONPATH"

# 1. Set JAVA_HOME
$JdkDir = Join-Path $ProjectRoot "tools\jdk"
$JdkSubdir = Get-ChildItem -Path $JdkDir -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($JdkSubdir) {
    $env:JAVA_HOME = $JdkSubdir.FullName.Trim()
} else {
    $env:JAVA_HOME = $JdkDir.Trim()
}
Write-Host "JAVA_HOME set to: '$env:JAVA_HOME'" -ForegroundColor Green

# 2. Start PostgreSQL
$PgCtl = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\postgres") -Filter "pg_ctl.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
$PgData = Join-Path $ProjectRoot "tools\postgres\data"
$PgLog = Join-Path $ProjectRoot "tools\postgres\pg.log"

if ($PgCtl -and (Test-Path $PgData)) {
    $pgPortOpen = (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $pgPortOpen) {
        Write-Host "[1/5] Starting PostgreSQL..." -ForegroundColor Yellow
        Start-Process -FilePath $PgCtl -ArgumentList "-D `"$PgData`" -l `"$PgLog`" start"
    } else {
        Write-Host "[1/5] PostgreSQL is already running on port 5432." -ForegroundColor Green
    }
} else {
    Write-Host "[1/5] PostgreSQL binary or data dir not found." -ForegroundColor Red
}

Write-Host "Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 3. Start Neo4j
$Neo4jBat = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\neo4j") -Filter "neo4j.bat" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1

if ($Neo4jBat) {
    $neo4jPortOpen = (Test-NetConnection -ComputerName 127.0.0.1 -Port 7687 -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $neo4jPortOpen) {
        Write-Host "[2/5] Starting Neo4j in console mode..." -ForegroundColor Yellow
        $Neo4jBinDir = Split-Path -Parent $Neo4jBat
        Start-Process -FilePath $Neo4jBat -ArgumentList "console" -WorkingDirectory $Neo4jBinDir
    } else {
        Write-Host "[2/5] Neo4j is already running on port 7687." -ForegroundColor Green
    }
} else {
    Write-Host "[2/5] Neo4j binary not found." -ForegroundColor Red
}

Write-Host "Waiting 10 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 4. Start Redis
$RedisServer = Get-ChildItem -Path (Join-Path $ProjectRoot "tools\redis") -Filter "redis-server.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1

if ($RedisServer) {
    $redisPortOpen = (Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $redisPortOpen) {
        Write-Host "[3/5] Starting Redis..." -ForegroundColor Yellow
        $RedisDir = Split-Path -Parent $RedisServer
        if (Test-Path (Join-Path $RedisDir "redis.conf")) {
            Start-Process -FilePath $RedisServer -ArgumentList "redis.conf" -WorkingDirectory $RedisDir
        } else {
            Start-Process -FilePath $RedisServer -WorkingDirectory $RedisDir
        }
    } else {
        Write-Host "[3/5] Redis is already running on port 6379." -ForegroundColor Green
    }
} else {
    Write-Host "[3/5] Redis server binary not found." -ForegroundColor Red
}

Write-Host "Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 5. Start FastAPI Backend
$VenvUvicorn = Join-Path $ProjectRoot ".venv311\Scripts\uvicorn.exe"
$VenvPython = Join-Path $ProjectRoot ".venv311\Scripts\python.exe"

$backendPortOpen = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $backendPortOpen) {
    Write-Host "[4/5] Starting FastAPI (Uvicorn)..." -ForegroundColor Yellow
    if (Test-Path $VenvUvicorn) {
        Start-Process -FilePath $VenvUvicorn -ArgumentList "app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory $BackendDir
    } else {
        Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory $BackendDir
    }
} else {
    Write-Host "[4/5] FastAPI is already running on port 8000." -ForegroundColor Green
}

Write-Host "Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 6. Start Celery Worker
$VenvCelery = Join-Path $ProjectRoot ".venv311\Scripts\celery.exe"

if (Test-Path $VenvCelery) {
    Write-Host "[5/5] Starting Celery worker..." -ForegroundColor Yellow
    Start-Process -FilePath $VenvCelery -ArgumentList "-A app.workers.celery_app worker --loglevel=info --pool=solo" -WorkingDirectory $BackendDir
} else {
    Write-Host "[5/5] Celery binary not found in virtual environment." -ForegroundColor Red
}

Write-Host "All services started. Backend at http://localhost:8000 | Neo4j browser at http://localhost:7474" -ForegroundColor Green
