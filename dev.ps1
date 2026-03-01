# Theatre VTT - Dev Launcher
# Kills any stale processes on 3001/5173, then starts server + client in separate windows

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[Theatre] Killing stale processes on ports 3001 and 5173..." -ForegroundColor Yellow

foreach ($port in @(3001, 5173)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed process on port $port" -ForegroundColor DarkGray
    }
}

Start-Sleep -Milliseconds 500

Write-Host "[Theatre] Starting server on http://localhost:3001 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Set-Location '$root'; pnpm --filter @theatre/server dev"

Start-Sleep -Seconds 2

Write-Host "[Theatre] Starting client on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); Set-Location '$root'; pnpm --filter @theatre/client dev"

Write-Host ""
Write-Host "[Theatre] Both services launching!" -ForegroundColor Green
Write-Host "  Client -> http://localhost:5173" -ForegroundColor White
Write-Host "  Server -> http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Close the two PowerShell windows to stop them." -ForegroundColor DarkGray
