# start-dev.ps1
# Servidor de desenvolvimento com reinicio interativo
# Ctrl+C para o backend; R para reiniciar; qualquer outra tecla para sair

$scriptDir = $PSScriptRoot
Set-Location $scriptDir

# Ativar ambiente virtual e configurar env
& "$scriptDir\venv\Scripts\Activate.ps1"
$env:FLASK_ENV = 'development'

while ($true) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Backend a iniciar..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    python run_waitress.py

    Write-Host ""
    Write-Host "  Backend parou." -ForegroundColor Yellow
    Write-Host "  [R] Reiniciar   [Enter / outra tecla] Sair" -ForegroundColor Gray

    $key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

    if ($key.Character -eq 'r' -or $key.Character -eq 'R') {
        Write-Host "  A reiniciar..." -ForegroundColor Green
        continue
    }

    break
}

Write-Host ""
Write-Host "  Terminal do backend encerrado." -ForegroundColor DarkGray
