# check_services.ps1 — Verifies port status for ClinicalKG services

Write-Host "Checking status of ClinicalKG backing services..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Gray

$services = @(
    @{ Name = "PostgreSQL"; Port = 5432 },
    @{ Name = "Neo4j (Bolt)"; Port = 7687 },
    @{ Name = "Redis";      Port = 6379 },
    @{ Name = "FastAPI Backend"; Port = 8000 }
)

$summary = @()

foreach ($svc in $services) {
    $port = $svc.Port
    $name = $svc.Name
    $res = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    $status = if ($res.TcpTestSucceeded) { "UP" } else { "DOWN" }
    
    $summary += [PSCustomObject]@{
        "Service Name" = $name
        "Port"         = $port
        "Status"       = $status
    }
}

Write-Host ""
Write-Host "=== ClinicalKG Service Status Summary ===" -ForegroundColor Yellow
foreach ($item in $summary) {
    if ($item.Status -eq "UP") {
        Write-Host " [UP]   $($item.'Service Name') on port $($item.Port)" -ForegroundColor Green
    } else {
        Write-Host " [DOWN] $($item.'Service Name') on port $($item.Port)" -ForegroundColor Red
    }
}
Write-Host "==========================================" -ForegroundColor Gray
