# Arranque dos servidores de desenvolvimento - AINTAR APP
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\\venv\\Scripts\\activate; `$env:FLASK_ENV='development'; python run_waitress.py" -WindowStyle Normal

# Frontend-v2 (Vite)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend-v2'; npm run dev" -WindowStyle Normal

Write-Host "Servidores iniciados!" -ForegroundColor Green
