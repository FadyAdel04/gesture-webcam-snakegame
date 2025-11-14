# PowerShell script to run server with virtual environment
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$venvPython = Join-Path $projectRoot "venv_cv\Scripts\python.exe"

Write-Host "🚀 Starting server with virtual environment..." -ForegroundColor Green
Set-Location $scriptPath
& $venvPython server.py

