# Deploy-Main.ps1
# Script principal do sistema de deployment modular
# Autor: Sistema Modular
# Data: 2025

param(
    [switch]$NonInteractive,
    [string]$Operation,
    [switch]$BuildFirst,
    [switch]$Verbose,
    [switch]$SkipValidation
)

# Configurar encoding para UTF-8 para garantir a exibição correta de caracteres especiais.
# chcp 65001 muda o code page da consola Windows para UTF-8 (necessário para acentos/caracteres PT)
& "$env:SystemRoot\system32\chcp.com" 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8


# ============================================================================
# CONFIGURACAO INICIAL
# ============================================================================

# Definir localizacao base do sistema
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Carregar modulos do sistema
$ModulesToLoad = @(
    "DeployConfig.ps1",
    "DeployLogger.ps1", 
    "DeployConnection.ps1",
    "DeployFrontend.ps1",
    "DeployBackend.ps1",
    "DeployNginx.ps1",
    "DeployUI.ps1",
    "DeployServerManager.ps1" # <-- Adicionar o novo módulo
)

Write-Host "A inicializar o Sistema de Deployment Modular..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

foreach ($module in $ModulesToLoad) {
    $modulePath = Join-Path $ScriptRoot $module
    if (Test-Path $modulePath) {
        try {
            . $modulePath
            Write-Host "[OK] $module carregado" -ForegroundColor Green
        }
        catch {
            Write-Host "[ERRO] Erro ao carregar $module : $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[ERRO] Modulo nao encontrado: $module" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================================
# INICIALIZACAO DO SISTEMA
# ============================================================================

function Initialize-DeploymentSystem {
    param([bool]$VerboseMode = $false)
    
    try {
        # Inicializar logger
        Initialize-Logger -VerboseMode $VerboseMode
        Write-DeployInfo "Sistema de deployment iniciado" "SYSTEM"
        
        # Validar configuracoes
        Write-DeployDebug "A validar configurações..." "SYSTEM"
        $configErrors = Test-DeployConfig
        
        if ($configErrors.Count -gt 0) {
            Write-DeployError "Erros de configuração encontrados:" "SYSTEM"
            foreach ($configError in $configErrors) {
                Write-DeployError "  - $configError" "SYSTEM"
            }
            return $false
        }
        
        Write-DeployInfo "Configurações validadas com sucesso" "SYSTEM"
        
        # Inicializar conexao (sem conectar ainda)
        if (-not (Initialize-ServerConnection)) {
            Write-DeployError "Falha ao inicializar gestor de ligações" "SYSTEM"
            return $false
        }
        
        Write-DeployInfo "Sistema inicializado com sucesso!" "SYSTEM"
        return $true
    }
    catch {
        Write-Host "Erro critico na inicializacao: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ============================================================================
# HELPERS INTERNOS DE DEPLOYMENT
# ============================================================================

# Limpa logs locais de desenvolvimento antes do deployment.
# - Ficheiros rotativos (.log.1, .log.2, ...) são sempre apagados (não estão em uso)
# - Ficheiros activos (.log) são truncados se possível; se bloqueados, ignorados
# - deployment.log é truncado para começar fresco
function Clear-LocalDevLogs {
    $backendPath = $Global:DeployConfig.CaminhoLocalBackend
    $rootPath    = Split-Path $backendPath -Parent

    Write-DeployInfo "A limpar logs de desenvolvimento locais..." "MAIN"
    $removed = 0
    $skipped = 0

    # 1. Apagar ficheiros rotativos (.log.1, .log.2, etc.) — nunca estão bloqueados
    $rotated = Get-ChildItem $backendPath -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '\.log\.\d+$' }
    foreach ($f in $rotated) {
        try {
            Remove-Item $f.FullName -Force -ErrorAction Stop
            $removed++
        } catch {
            $skipped++
        }
    }

    # 2. Truncar logs activos se não estiverem bloqueados
    $activeLogs = Get-ChildItem $backendPath -Recurse -File -Filter '*.log' -ErrorAction SilentlyContinue
    foreach ($f in $activeLogs) {
        try {
            [System.IO.File]::WriteAllText($f.FullName, '') | Out-Null
            $removed++
        } catch {
            Write-DeployDebug "Log bloqueado (backend em execução): $($f.Name)" "MAIN"
            $skipped++
        }
    }

    # 3. Truncar deployment.log (na raiz do projecto)
    $deployLog = Join-Path $rootPath "deployment.log"
    if (Test-Path $deployLog) {
        try {
            [System.IO.File]::WriteAllText($deployLog, '') | Out-Null
            $removed++
        } catch {
            $skipped++
        }
    }

    if ($skipped -gt 0) {
        Write-DeployInfo "Logs limpos: $removed | Bloqueados (backend em execução): $skipped" "MAIN"
    } else {
        Write-DeployInfo "Logs limpos: $removed ficheiro(s)" "MAIN"
    }
}

# Imprime o resumo de tempos no final de cada operação
function Write-DeployTimingSummary {
    param(
        [string]$OperationName,
        [System.Collections.Specialized.OrderedDictionary]$Timings,
        [timespan]$TotalDuration,
        [timespan]$MaintenanceDuration
    )
    Write-DeployInfo "=== RESUMO DE TEMPOS: $OperationName ===" "MAIN"
    foreach ($key in $Timings.Keys) {
        $label = ($key + ":").PadRight(46)
        $secs  = [Math]::Round($Timings[$key].TotalSeconds, 1)
        Write-DeployInfo "  $label ${secs}s" "MAIN"
    }
    if ($MaintenanceDuration.TotalSeconds -gt 0) {
        $mainLabel = "JANELA DE MANUTENÇÃO (indisponibilidade):".PadRight(46)
        $mainSecs  = [Math]::Round($MaintenanceDuration.TotalSeconds, 1)
        Write-DeployInfo "  $mainLabel ${mainSecs}s  ← tempo de downtime real" "MAIN"
    }
    $totalLabel = "TOTAL:".PadRight(46)
    $totalSecs  = [Math]::Round($TotalDuration.TotalSeconds, 1)
    Write-DeployInfo "  $totalLabel ${totalSecs}s" "MAIN"
    Write-DeployInfo "=============================================" "MAIN"
}

# Executa a janela de manutenção mínima: ativa manutenção, para/inicia backend, desativa manutenção.
# Parâmetros Timings e MaintenanceDuration são passados por referência e preenchidos aqui.
function Invoke-MaintenanceWindow {
    param(
        [ref]$Timings,
        [ref]$MaintenanceDuration,
        [bool]$RestartBackend = $true
    )
    $mainStart = Get-Date
    $ok        = $false

    try {
        $t = Get-Date
        if (-not (Enable-MaintenanceMode)) { throw "Falha ao ativar modo de manutenção." }
        $Timings.Value["Modo de manutenção (ativar)"] = (Get-Date) - $t

        if ($RestartBackend) {
            $t = Get-Date
            if (-not (Stop-BackendProcess)) { throw "Falha ao parar o backend." }
            $Timings.Value["Parar backend"] = (Get-Date) - $t

            Write-DeployInfo "A aguardar 5 segundos para o processo terminar..." "MAIN"
            Start-Sleep -Seconds 5
        }

        $ok = $true
        return $true
    }
    catch {
        Write-DeployError "Erro durante janela de manutenção: $($_.Exception.Message)" "MAIN"
        return $false
    }
    finally {
        if ($RestartBackend) {
            $t = Get-Date
            Write-DeployInfo "A iniciar o backend..." "MAIN"
            Start-BackendProcess
            Start-Sleep -Seconds 5
            $Timings.Value["Iniciar backend"] = (Get-Date) - $t
        }

        $t = Get-Date
        Write-DeployInfo "A desativar o modo de manutenção..." "MAIN"
        Disable-MaintenanceMode
        $Timings.Value["Modo de manutenção (desativar)"] = (Get-Date) - $t

        $MaintenanceDuration.Value = (Get-Date) - $mainStart
    }
}

# ============================================================================
# OPERACOES DE DEPLOYMENT
# Estratégia em 2 fases:
#   FASE 1 — Build + Cópia ANTES da manutenção (site em produção, sem downtime)
#   FASE 2 — Manutenção mínima: apenas parar e reiniciar o backend (~148s)
# ============================================================================

function Invoke-FrontendBackendDeployment {
    param([bool]$BuildFirst = $true)

    Write-DeployInfo "=== DEPLOYMENT FRONTEND + BACKEND ===" "MAIN"
    Write-DeployInfo "Estratégia: Cópia antecipada → Manutenção mínima (só reinício)" "MAIN"

    $totalStart = Get-Date
    $timings    = [ordered]@{}
    $mainDur    = [timespan]::Zero

    # ── FASE 1: Build + Cópia (site em produção) ─────────────────────────────
    Write-DeployInfo "--- FASE 1: Preparação (site em produção) ---" "MAIN"
    Clear-LocalDevLogs

    if ($BuildFirst) {
        $t  = Get-Date
        $fe = [FrontendDeployer]::new()
        if (-not $fe.BuildProject()) {
            Write-DeployError "Build do frontend falhou. Deployment cancelado." "MAIN"
            return $false
        }
        $timings["Build frontend"] = (Get-Date) - $t
    }

    $t      = Get-Date
    $copyOk = Invoke-WithServerConnection -ScriptBlock {
        $feDeployer = [FrontendDeployer]::new()
        if (-not $feDeployer.Deploy()) { return $false }
        $beDeployer = [BackendDeployer]::new()
        return $beDeployer.Deploy()
    } -OperationName "Cópia Frontend + Backend"
    $timings["Cópia frontend + backend"] = (Get-Date) - $t

    if (-not $copyOk) {
        Write-DeployError "Falha na cópia dos ficheiros. Manutenção NÃO foi ativada. Site mantém versão anterior." "MAIN"
        Write-DeployTimingSummary -OperationName "Deployment Frontend + Backend" `
            -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur
        return $false
    }
    Write-DeployInfo "Ficheiros copiados com sucesso! A iniciar janela de manutenção mínima..." "MAIN"

    # ── FASE 2: Manutenção mínima (apenas reiniciar backend) ─────────────────
    Write-DeployInfo "--- FASE 2: Manutenção mínima (reinício do backend) ---" "MAIN"

    $result = Invoke-MaintenanceWindow -Timings ([ref]$timings) `
        -MaintenanceDuration ([ref]$mainDur) -RestartBackend $true

    if ($result) {
        Write-DeployInfo "=== 'Deployment Frontend + Backend' FINALIZADO COM SUCESSO ===" "MAIN"
    }
    Write-DeployTimingSummary -OperationName "Deployment Frontend + Backend" `
        -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur

    return $result
}

function Invoke-FullDeployment {
    param([bool]$BuildFirst = $true)

    Write-DeployInfo "=== DEPLOYMENT COMPLETO ===" "MAIN"
    Write-DeployInfo "Estratégia: Cópia antecipada → Manutenção mínima (só reinício)" "MAIN"

    $totalStart = Get-Date
    $timings    = [ordered]@{}
    $mainDur    = [timespan]::Zero

    # ── FASE 1: Build + Cópia (site em produção) ─────────────────────────────
    Write-DeployInfo "--- FASE 1: Preparação (site em produção) ---" "MAIN"
    Clear-LocalDevLogs

    if ($BuildFirst) {
        $t  = Get-Date
        $fe = [FrontendDeployer]::new()
        if (-not $fe.BuildProject()) {
            Write-DeployError "Build do frontend falhou. Deployment cancelado." "MAIN"
            return $false
        }
        $timings["Build frontend"] = (Get-Date) - $t
    }

    $t      = Get-Date
    $copyOk = Invoke-WithServerConnection -ScriptBlock {
        $feDeployer = [FrontendDeployer]::new()
        if (-not $feDeployer.Deploy()) { return $false }
        $beDeployer = [BackendDeployer]::new()
        if (-not $beDeployer.Deploy()) { return $false }
        return Deploy-NginxConfig
    } -OperationName "Cópia Completa"
    $timings["Cópia frontend + backend + nginx"] = (Get-Date) - $t

    if (-not $copyOk) {
        Write-DeployError "Falha na cópia dos ficheiros. Manutenção NÃO foi ativada. Site mantém versão anterior." "MAIN"
        Write-DeployTimingSummary -OperationName "Deployment Completo" `
            -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur
        return $false
    }
    Write-DeployInfo "Ficheiros copiados com sucesso! A iniciar janela de manutenção mínima..." "MAIN"

    # ── FASE 2: Manutenção mínima ─────────────────────────────────────────────
    Write-DeployInfo "--- FASE 2: Manutenção mínima (reinício do backend) ---" "MAIN"

    $result = Invoke-MaintenanceWindow -Timings ([ref]$timings) `
        -MaintenanceDuration ([ref]$mainDur) -RestartBackend $true

    if ($result) {
        Write-DeployInfo "=== 'Deployment Completo' FINALIZADO COM SUCESSO ===" "MAIN"
    }
    Write-DeployTimingSummary -OperationName "Deployment Completo" `
        -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur

    return $result
}

function Invoke-FrontendDeployment {
    param([bool]$BuildFirst = $true)

    Write-DeployInfo "=== DEPLOYMENT FRONTEND ===" "MAIN"
    Write-DeployInfo "Estratégia: Cópia antecipada → Manutenção breve (sem reinício backend)" "MAIN"

    $totalStart = Get-Date
    $timings    = [ordered]@{}
    $mainDur    = [timespan]::Zero

    # ── FASE 1: Build + Cópia (site em produção) ─────────────────────────────
    Write-DeployInfo "--- FASE 1: Preparação (site em produção) ---" "MAIN"
    Clear-LocalDevLogs

    if ($BuildFirst) {
        $t  = Get-Date
        $fe = [FrontendDeployer]::new()
        if (-not $fe.BuildProject()) {
            Write-DeployError "Build do frontend falhou. Deployment cancelado." "MAIN"
            return $false
        }
        $timings["Build frontend"] = (Get-Date) - $t
    }

    $t      = Get-Date
    $copyOk = Invoke-WithServerConnection -ScriptBlock {
        $feDeployer = [FrontendDeployer]::new()
        return $feDeployer.Deploy()
    } -OperationName "Cópia Frontend"
    $timings["Cópia frontend"] = (Get-Date) - $t

    if (-not $copyOk) {
        Write-DeployError "Falha na cópia dos ficheiros. Manutenção NÃO foi ativada." "MAIN"
        Write-DeployTimingSummary -OperationName "Deployment Frontend" `
            -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur
        return $false
    }
    Write-DeployInfo "Frontend copiado! A ativar manutenção brevemente..." "MAIN"

    # ── FASE 2: Manutenção breve (sem reinício de backend — não necessário para frontend) ──
    Write-DeployInfo "--- FASE 2: Manutenção breve (sem reinício do backend) ---" "MAIN"

    $result = Invoke-MaintenanceWindow -Timings ([ref]$timings) `
        -MaintenanceDuration ([ref]$mainDur) -RestartBackend $false

    if ($result) {
        Write-DeployInfo "=== 'Deployment Frontend' FINALIZADO COM SUCESSO ===" "MAIN"
    }
    Write-DeployTimingSummary -OperationName "Deployment Frontend" `
        -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur

    return $result
}

function Invoke-BackendDeployment {
    Write-DeployInfo "=== DEPLOYMENT BACKEND ===" "MAIN"
    Write-DeployInfo "Estratégia: Cópia antecipada → Manutenção mínima (só reinício)" "MAIN"

    $totalStart = Get-Date
    $timings    = [ordered]@{}
    $mainDur    = [timespan]::Zero

    # ── FASE 1: Cópia (site em produção) ─────────────────────────────────────
    Write-DeployInfo "--- FASE 1: Cópia do backend (site em produção) ---" "MAIN"
    Clear-LocalDevLogs

    $t      = Get-Date
    $copyOk = Invoke-WithServerConnection -ScriptBlock {
        $beDeployer = [BackendDeployer]::new()
        return $beDeployer.Deploy()
    } -OperationName "Cópia Backend"
    $timings["Cópia backend"] = (Get-Date) - $t

    if (-not $copyOk) {
        Write-DeployError "Falha na cópia dos ficheiros. Manutenção NÃO foi ativada." "MAIN"
        Write-DeployTimingSummary -OperationName "Deployment Backend" `
            -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur
        return $false
    }
    Write-DeployInfo "Backend copiado! A iniciar janela de manutenção mínima..." "MAIN"

    # ── FASE 2: Manutenção mínima ─────────────────────────────────────────────
    Write-DeployInfo "--- FASE 2: Manutenção mínima (reinício do backend) ---" "MAIN"

    $result = Invoke-MaintenanceWindow -Timings ([ref]$timings) `
        -MaintenanceDuration ([ref]$mainDur) -RestartBackend $true

    if ($result) {
        Write-DeployInfo "=== 'Deployment Backend' FINALIZADO COM SUCESSO ===" "MAIN"
    }
    Write-DeployTimingSummary -OperationName "Deployment Backend" `
        -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur

    return $result
}

function Invoke-NginxDeployment {
    Write-DeployInfo "=== DEPLOYMENT CONFIGURAÇÃO NGINX ===" "MAIN"
    Write-DeployInfo "Estratégia: Cópia antecipada → Manutenção mínima (reinício backend)" "MAIN"

    $totalStart = Get-Date
    $timings    = [ordered]@{}
    $mainDur    = [timespan]::Zero

    $t      = Get-Date
    $copyOk = Invoke-WithServerConnection -ScriptBlock {
        return Deploy-NginxConfig
    } -OperationName "Cópia Nginx"
    $timings["Cópia configuração nginx"] = (Get-Date) - $t

    if (-not $copyOk) {
        Write-DeployError "Falha na cópia da configuração Nginx. Manutenção NÃO foi ativada." "MAIN"
        Write-DeployTimingSummary -OperationName "Deployment Nginx" `
            -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur
        return $false
    }

    $result = Invoke-MaintenanceWindow -Timings ([ref]$timings) `
        -MaintenanceDuration ([ref]$mainDur) -RestartBackend $true

    if ($result) {
        Write-DeployInfo "=== 'Deployment Configuração Nginx' FINALIZADO COM SUCESSO ===" "MAIN"
    }
    Write-DeployTimingSummary -OperationName "Deployment Configuração Nginx" `
        -Timings $timings -TotalDuration ((Get-Date) - $totalStart) -MaintenanceDuration $mainDur

    return $result
}

# ============================================================================
# MODO NAO INTERATIVO
# ============================================================================

function Invoke-NonInteractiveMode {
    param(
        [string]$Operation,
        [bool]$BuildFirst,
        [bool]$SkipValidation
    )
    
    Write-DeployInfo "A executar em modo não interativo: $Operation" "MAIN"
    
    $result = $false
    
    switch ($Operation.ToLower()) {
        "full" {
            $result = Invoke-FullDeployment -BuildFirst $BuildFirst
        }
        "frontend" {
            $result = Invoke-FrontendDeployment -BuildFirst $BuildFirst
        }
        "frontend-nobuild" {
            $result = Invoke-FrontendDeployment -BuildFirst $false
        }
        "backend" {
            $result = Invoke-BackendDeployment
        }
        "frontend-backend" {
            $result = Invoke-FrontendBackendDeployment -BuildFirst $BuildFirst
        }
        "nginx" {
            $result = Invoke-NginxDeployment
        }
        "test-connection" {
            $testResult = Test-ServerConnectivity
            $result = $testResult.NetworkReachable -and $testResult.ShareAccessible
        }
        "build-only" {
            $result = Build-Frontend
        }
        "validate-build" {
            $result = Test-FrontendBuild
        }
        default {
            Write-DeployError "Operação não reconhecida: $Operation" "MAIN"
            Write-DeployInfo "Operações disponíveis: full, frontend, frontend-nobuild, backend, frontend-backend, nginx, test-connection, build-only, validate-build" "MAIN"
            return $false
        }
    }
    
    if ($result) {
        Write-DeployInfo "Operação '$Operation' concluída com sucesso!" "MAIN"
        exit 0
    } else {
        Write-DeployError "Operação '$Operation' falhou!" "MAIN"
        exit 1
    }
}

# ============================================================================  
# MODO INTERATIVO  
# ============================================================================  

function Start-InteractiveMode {
    Write-DeployInfo "A iniciar modo interativo" "MAIN"

    $menuActions = @{
        "1" = @{ Name = "Deployment Completo (Frontend + Backend + Nginx)"; Action = { Invoke-FullDeployment -BuildFirst $true } }
        "2" = @{ Name = "Deployment Frontend (com build)"; Action = { Invoke-FrontendDeployment -BuildFirst $true } }
        "3" = @{ Name = "Deployment Frontend (sem build)"; Action = { 
                if (-not (Test-FrontendBuild)) {
                    Show-DeployStatus "Build não encontrado ou inválido!" "Error"
                    if (Confirm-Action "Deseja fazer o build antes do deployment?") {
                        return Invoke-FrontendDeployment -BuildFirst $true
                    }
                    Show-DeployStatus "Deployment cancelado pelo utilizador" "Warning"
                    return $null # Indica que nenhuma ação foi tomada
                }
                return Invoke-FrontendDeployment -BuildFirst $false
            } }
        "4" = @{ Name = "Deployment Backend"; Action = { Invoke-BackendDeployment } }
        "5" = @{ Name = "Deployment Frontend + Backend (sem Nginx)"; Action = { Invoke-FrontendBackendDeployment -BuildFirst $true } }
        "6" = @{ Name = "Deployment Configuração Nginx"; Action = { Invoke-NginxDeployment } }
        "7" = @{ Name = "Ver ficheiros em estado relevante"; Action = { Show-FileStatus; return $null } }
        "8" = @{ Name = "Ver informações do sistema"; Action = { Show-SystemInfo; return $null } }
        "9" = @{ Name = "Testar conectividade com o servidor"; Action = { Show-ConnectivityTest; return $null } }
        "10" = @{ Name = "Mostrar estrutura do servidor"; Action = { Show-ServerStructure; return $null } }
        "12" = @{ Name = "DIAGNOSTICO - Verificar permissoes WinRM (CredSSP)"; Action = { Show-RemoteExecutionTest; return $null } }
        "11" = @{ Name = "Configurações avançadas"; Action = { Show-AdvancedSettings; return $null } }
    }

    while ($true) {
        Show-DeployMenu -MenuActions $menuActions
        $opcao = Get-UserChoice

        if ($opcao -eq "0") {
            Write-DeployInfo "Sistema finalizado pelo utilizador" "MAIN"
            Show-DeployStatus "A encerrar o sistema..." "Info"
            break
        }

        $menuItem = $menuActions[$opcao]
        if ($menuItem) {
            Write-DeployInfo "A iniciar: $($menuItem.Name)" "MAIN"
            Show-DeployStatus "A executar: $($menuItem.Name)..." "Info"
            
            $result = & $menuItem.Action
            
            # Apenas mostrar status de sucesso/falha para ações que retornam um booleano
            if ($result -is [bool]) {
                if ($result) {
                    Show-DeployStatus "$($menuItem.Name) concluído com sucesso!" "Success"
                } else {
                    Show-DeployStatus "$($menuItem.Name) falhou!" "Error"
                }
            }
            
            $Global:UI.PauseForUser()
        } else {
            Show-DeployStatus "Opção inválida!" "Error"
            Start-Sleep -Seconds 1
        }
    }
}

# ============================================================================  
# MENU INTERATIVO  
# ============================================================================  

function Show-DeployMenu {
    param($MenuActions)

    Clear-Host
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "         SISTEMA DE DEPLOYMENT MODULAR         " -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""

    # Obter e ordenar as chaves do menu
    $menuKeys = $MenuActions.Keys | Sort-Object { if ($_ -match '^\d+$') { [int]$_ } else { 999 } }

    foreach ($key in $menuKeys) {
        # Adicionar a linha de separação
        if ($key -eq "7") {
            Write-Host "-----------------------------------------------" -ForegroundColor DarkGray
        }
        
        $padding = if ([int]$key -lt 10) { " " } else { "" }
        Write-Host "$padding$key. $($MenuActions[$key].Name)"
    }
    
    Write-Host ""
    Write-Host " 0. Sair"
    Write-Host ""
}


# ============================================================================
# FUNCAO PRINCIPAL
# ============================================================================

function Main {
    param(
        [switch]$NonInteractive = $false,
        [string]$Operation = "",
        [switch]$BuildFirst = $false,
        [switch]$Verbose = $false,
        [switch]$SkipValidation = $false
    )
    
    try {
        # Inicializar sistema
        if (-not (Initialize-DeploymentSystem -VerboseMode $Verbose)) {
            Write-Host "Falha na inicializacao do sistema!" -ForegroundColor Red
            exit 1
        }
        
        # Executar modo apropriado
        if ($NonInteractive -and -not [string]::IsNullOrEmpty($Operation)) {
            Invoke-NonInteractiveMode -Operation $Operation -BuildFirst $BuildFirst -SkipValidation $SkipValidation
        } else {
            Start-InteractiveMode
        }
        
        Write-DeployInfo "Sistema finalizado normalmente" "SYSTEM"
    }
    catch {
        Write-Host "Erro critico no sistema: $($_.Exception.Message)" -ForegroundColor Red
        Write-DeployException $_.Exception "Sistema principal" "SYSTEM"
        exit 1
    }
    finally {
        # Limpeza final
        try {
            Disconnect-DeployServer
        }
        catch {
            # Ignorar erros de desconexao na finalizacao
        }
    }
}

# ============================================================================
# HELP E INFORMACOES DE USO
# ============================================================================

function Show-Help {
    Write-Host @"

SISTEMA DE DEPLOYMENT MODULAR - Ajuda

USO:
    .\Deploy-Main.ps1                                   # Modo interativo
    .\Deploy-Main.ps1 -NonInteractive -Operation "op"  # Modo nao interativo

OPERACOES DISPONIVEIS (Modo nao interativo):
    full                 - Deployment completo (Frontend + Backend + Nginx)
    frontend             - Deployment do frontend (com build)
    frontend-nobuild     - Deployment do frontend (sem build)
    backend              - Deployment apenas do backend
    frontend-backend     - Deployment do frontend e backend (sem Nginx)
    nginx                - Deployment apenas da configuracao Nginx
    test-connection      - Testar conectividade com o servidor
    build-only           - Apenas fazer build do frontend
    validate-build       - Validar build existente do frontend

PARAMETROS:
    -NonInteractive      - Executar em modo nao interativo
    -Operation           - Operacao a executar (obrigatorio com -NonInteractive)
    -BuildFirst          - Fazer build do frontend antes do deployment
    -Verbose             - Habilitar logging detalhado
    -SkipValidation      - Pular validacoes (use com cuidado)

EXEMPLOS:
    .\Deploy-Main.ps1
    .\Deploy-Main.ps1 -NonInteractive -Operation "full" -BuildFirst -Verbose
    .\Deploy-Main.ps1 -NonInteractive -Operation "frontend" -BuildFirst
    .\Deploy-Main.ps1 -NonInteractive -Operation "test-connection"

ARQUIVOS DO SISTEMA:
    DeployConfig.ps1     - Configuracoes centralizadas
    DeployLogger.ps1     - Sistema de logging
    DeployConnection.ps1 - Gestao de conexoes
    DeployFrontend.ps1   - Modulo de deploy do frontend
    DeployBackend.ps1    - Modulo de deploy do backend
    DeployNginx.ps1      - Modulo de configuracao Nginx
    DeployUI.ps1         - Interface de usuario
    Deploy-Main.ps1      - Script principal (este arquivo)

"@ -ForegroundColor Cyan
}

# ============================================================================
# EXECUCAO PRINCIPAL
# ============================================================================

# Verificar se foi solicitada ajuda
if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "help") {
    Show-Help
    exit 0
}

# Executar funcao principal com parametros
Main -NonInteractive:$NonInteractive -Operation $Operation -BuildFirst:$BuildFirst -Verbose:$Verbose -SkipValidation:$SkipValidation