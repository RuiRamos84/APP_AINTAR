# RestartBackend.ps1
# Script de restart local do backend (executar diretamente no servidor)
# Uso: powershell -ExecutionPolicy Bypass -File RestartBackend.ps1
# Uso com janela oculta: RestartBackend.ps1 -Hidden

param(
    [switch]$Hidden  # Iniciar o backend sem janela visível (modo produção)
)

$BackendScript  = "D:\APP\NewAPP\backend\start.bat"
$ProcessName    = "python"
$WaitAfterStop  = 3   # segundos após terminar processos
$WaitAfterStart = 5   # segundos para verificar se o backend iniciou

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       RESTART BACKEND - AINTAR APP       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Parar processos Python existentes ---
Write-Host "[1/2] A parar processos backend..." -ForegroundColor Yellow

$processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "      Encontrados $($processes.Count) processo(s) '$ProcessName':"
    foreach ($proc in $processes) {
        Write-Host "      - A terminar PID $($proc.Id)..." -NoNewline
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Write-Host " OK" -ForegroundColor Green
    }

    Write-Host "      A aguardar $WaitAfterStop segundos..." -ForegroundColor Gray
    Start-Sleep -Seconds $WaitAfterStop

    # Verificar se ficaram processos
    $remaining = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "      [AVISO] Ainda existem $($remaining.Count) processo(s) a correr!" -ForegroundColor Red
    } else {
        Write-Host "      [OK] Todos os processos terminados." -ForegroundColor Green
    }
} else {
    Write-Host "      [INFO] Nenhum processo '$ProcessName' ativo." -ForegroundColor Gray
}

Write-Host ""

# --- 2. Iniciar backend ---
Write-Host "[2/2] A iniciar backend..." -ForegroundColor Yellow
Write-Host "      Script: $BackendScript"

if (-not (Test-Path $BackendScript)) {
    Write-Host ""
    Write-Host "      [ERRO] Script de arranque não encontrado: $BackendScript" -ForegroundColor Red
    Write-Host ""
    exit 1
}

$workDir     = Split-Path $BackendScript -Parent
$windowStyle = if ($Hidden) { "Hidden" } else { "Normal" }

Write-Host "      Modo: $(if ($Hidden) { 'Background (sem janela)' } else { 'Janela visível (debug)' })" -ForegroundColor Gray

Start-Process -FilePath $BackendScript -WorkingDirectory $workDir -WindowStyle $windowStyle

Write-Host "      A aguardar $WaitAfterStart segundos para verificar arranque..."
Start-Sleep -Seconds $WaitAfterStart

$check = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "      [OK] Backend a correr ($($check.Count) processo(s) Python)" -ForegroundColor Green
    foreach ($proc in $check) {
        Write-Host "           PID: $($proc.Id)" -ForegroundColor Gray
    }
} else {
    Write-Host "      [AVISO] Nenhum processo Python detetado ainda." -ForegroundColor Yellow
    Write-Host "              O backend pode ainda estar a iniciar. Verifique manualmente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "           RESTART CONCLUÍDO              " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
