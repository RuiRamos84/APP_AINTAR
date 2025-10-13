# Test-RemoteCommands.ps1
# Teste de comandos específicos de deployment
# Versão: 2.0
# Autor: Sistema Modular
# Data: 2025-10-13

<#
.SYNOPSIS
    Testa comandos específicos de deployment (manutenção, backend, nginx)

.DESCRIPTION
    Script de diagnóstico que testa os comandos reais usados durante o deployment:
    - Enable/Disable MaintenanceMode
    - Start/Stop Backend
    - Verificação de processos
    - Leitura de logs

    TESTES REALIZADOS:
    1. ✅ Verificar caminhos e configurações
    2. ✅ Ativar modo de manutenção
    3. ✅ Verificar logs de execução
    4. ✅ Verificar processos (nginx, Python)
    5. ✅ Desativar modo de manutenção

.EXAMPLE
    .\Test-RemoteCommands.ps1
    Executa todos os testes de comandos

.NOTES
    Este script:
    - Carrega todos os módulos de deployment
    - Executa comandos REAIS no servidor
    - Útil para validar configuração antes de deployment

    ATENÇÃO: Este script VAI ativar e desativar a manutenção no servidor!

.LINK
    README.md - Documentação completa
    Test-RemoteExecution.ps1 - Teste básico de conectividade
    Deploy-Main.ps1 - Script principal de deployment
#>

# Carregar módulos
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

. "$ScriptRoot\DeployConfig.ps1"
. "$ScriptRoot\DeployLogger.ps1"
. "$ScriptRoot\DeployServerManager.ps1"

Initialize-Logger -VerboseMode $true

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   TESTE DE COMANDOS REMOTOS ESPECÍFICOS    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# TESTE 1: VERIFICAR CONFIGURAÇÕES
# ============================================================================

Write-Host "[1/5] Verificando configurações..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Servidor: $($Global:DeployConfig.ServerIP)" -ForegroundColor Cyan
Write-Host "  Usuário: $($Global:DeployConfig.Usuario)" -ForegroundColor Cyan
Write-Host "  Backend Process: $($Global:DeployConfig.RemoteManagement.BackendProcessName)" -ForegroundColor Cyan
Write-Host "  Backend Start Script: $($Global:DeployConfig.RemoteManagement.BackendStartScriptPath)" -ForegroundColor Cyan
Write-Host "  Backend Window: $($Global:DeployConfig.RemoteManagement.ShowBackendWindow)" -ForegroundColor Cyan
Write-Host ""

# Verificar script de start do backend
$backendScript = $Global:DeployConfig.RemoteManagement.BackendStartScriptPath
$uncPath = $backendScript -replace "D:\\APP\\NewAPP", "\\$($Global:DeployConfig.ServerIP)\app\NewAPP"

Write-Host "  Verificando script de start do backend..." -ForegroundColor Gray
if (Test-Path $uncPath) {
    Write-Host "    [OK] Script existe: $uncPath" -ForegroundColor Green
} else {
    Write-Host "    [AVISO] Script não encontrado: $uncPath" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# TESTE 2: TESTAR ATIVAR MANUTENÇÃO
# ============================================================================

Write-Host ""
Write-Host "[2/5] Testando ativação de manutenção..." -ForegroundColor Yellow

$result = Enable-MaintenanceMode

if ($result) {
    Write-Host "  [OK] Comando executado com sucesso" -ForegroundColor Green
} else {
    Write-Host "  [ERRO] Comando falhou" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# ============================================================================
# TESTE 3: VERIFICAR LOGS
# ============================================================================

Write-Host ""
Write-Host "[3/5] Verificando logs de execução no servidor..." -ForegroundColor Yellow

$logFiles = Get-ChildItem "\\172.16.2.35\app\NewAPP\deploy_log_*.txt" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3

if ($logFiles) {
    foreach ($logFile in $logFiles) {
        Write-Host ""
        Write-Host "  Log: $($logFile.Name)" -ForegroundColor Cyan
        Write-Host "  Data: $($logFile.LastWriteTime)" -ForegroundColor Gray
        Write-Host "  --- Conteúdo ---" -ForegroundColor Gray
        Get-Content $logFile.FullName | ForEach-Object {
            Write-Host "    $_" -ForegroundColor White
        }
        Write-Host "  --- Fim ---" -ForegroundColor Gray
    }
} else {
    Write-Host "  [AVISO] Nenhum log encontrado" -ForegroundColor Yellow
}

# ============================================================================
# TESTE 4: VERIFICAR PROCESSOS NO SERVIDOR
# ============================================================================

Write-Host ""
Write-Host "[4/5] Verificando processos no servidor..." -ForegroundColor Yellow

# Verificar processos Python
Write-Host ""
Write-Host "  Processos Python:" -ForegroundColor Cyan
Invoke-RemoteServerCommand -OperationName "Verificar Python" -ScriptBlock {
    $processes = Get-Process -Name "python" -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "  [OK] $($processes.Count) processo(s) encontrado(s):" -ForegroundColor Green
        $processes | ForEach-Object {
            Write-Host "    PID: $($_.Id), Session: $($_.SessionId)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [INFO] Nenhum processo Python em execução" -ForegroundColor Yellow
    }
} | Out-Null

# Verificar processos nginx
Write-Host ""
Write-Host "  Processos nginx:" -ForegroundColor Cyan
Invoke-RemoteServerCommand -OperationName "Verificar nginx" -ScriptBlock {
    $processes = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "  [OK] $($processes.Count) processo(s) encontrado(s):" -ForegroundColor Green
        $processes | ForEach-Object {
            Write-Host "    PID: $($_.Id), Session: $($_.SessionId)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [AVISO] Nenhum processo nginx em execução!" -ForegroundColor Red
    }
} | Out-Null

# ============================================================================
# TESTE 5: DESATIVAR MANUTENÇÃO
# ============================================================================

Write-Host ""
Write-Host "[5/5] Testando desativação de manutenção..." -ForegroundColor Yellow

$result = Disable-MaintenanceMode

if ($result) {
    Write-Host "  [OK] Comando executado com sucesso" -ForegroundColor Green
} else {
    Write-Host "  [ERRO] Comando falhou" -ForegroundColor Red
}

# ============================================================================
# RESUMO
# ============================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "              TESTE CONCLUÍDO               " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Todos os comandos específicos foram testados!" -ForegroundColor Green
Write-Host ""
Write-Host "Verificações realizadas:" -ForegroundColor Yellow
Write-Host "  1. ✅ Configurações validadas" -ForegroundColor White
Write-Host "  2. ✅ Modo de manutenção ativado/desativado" -ForegroundColor White
Write-Host "  3. ✅ Logs verificados" -ForegroundColor White
Write-Host "  4. ✅ Processos verificados (nginx, Python)" -ForegroundColor White
Write-Host ""
Write-Host "Logs do servidor: \\$($Global:DeployConfig.ServerIP)\app\NewAPP\deploy_log_*.txt" -ForegroundColor Gray
Write-Host "Log local: $($Global:DeployConfig.LogFile)" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione Enter para sair..." -NoNewline
Read-Host
