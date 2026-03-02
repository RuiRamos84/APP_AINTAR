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
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8


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
            foreach ($error in $configErrors) {
                Write-DeployError "  - $error" "SYSTEM"
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
# OPERACOES DE DEPLOYMENT
# ============================================================================

function Invoke-WithMaintenance {
    param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$Action,
        [string]$OperationName = "Operação de Deployment",
        [array]$ArgumentList = @()
    )

    Write-DeployInfo "=== A INICIAR '$OperationName' COM GESTÃO DE MANUTENÇÃO ===" "MAIN"

    # O bloco finally garante que a manutenção é desativada e o backend reiniciado,
    # mesmo que o deployment falhe a meio.
    $totalStart = Get-Date
    $timings    = [ordered]@{}

    try {
        # 1. Ativar modo de manutenção
        $t = Get-Date
        if (-not (Enable-MaintenanceMode)) { throw "Falha ao ativar modo de manutenção." }
        $timings["Modo de manutenção (ativar)"] = (Get-Date) - $t

        # 2. Parar o processo do backend
        $t = Get-Date
        if (-not (Stop-BackendProcess)) { throw "Falha ao parar o backend." }
        $timings["Parar backend"] = (Get-Date) - $t

        Write-DeployInfo "A aguardar 5 segundos para o processo terminar..." "MAIN"
        Start-Sleep -Seconds 5

        # 3. Executar a ação de deployment principal
        $t = Get-Date
        $result = & $Action @ArgumentList
        $timings[$OperationName] = (Get-Date) - $t

        if (-not $result) {
            throw "A operação de deployment '$OperationName' falhou durante a execução."
        }

        Write-DeployInfo "=== '$OperationName' FINALIZADO COM SUCESSO ===" "MAIN"
        return $true
    }
    catch {
        Write-DeployError "Ocorreu um erro durante '$OperationName': $($_.Exception.Message)" "MAIN"
        Write-DeployException $_.Exception $OperationName "MAIN"
        return $false
    }
    finally {
        # 4. Iniciar o backend
        $t = Get-Date
        Write-DeployInfo "A iniciar o backend..." "MAIN"
        Start-BackendProcess
        Start-Sleep -Seconds 5
        $timings["Iniciar backend"] = (Get-Date) - $t

        # 5. Desativar modo de manutenção
        $t = Get-Date
        Write-DeployInfo "A desativar o modo de manutenção..." "MAIN"
        Disable-MaintenanceMode
        $timings["Modo de manutenção (desativar)"] = (Get-Date) - $t

        # Resumo de tempos
        $totalDuration = (Get-Date) - $totalStart
        Write-DeployInfo "=== RESUMO DE TEMPOS: $OperationName ===" "MAIN"
        foreach ($key in $timings.Keys) {
            $label = ($key + ":").PadRight(42)
            $secs  = [Math]::Round($timings[$key].TotalSeconds, 1)
            Write-DeployInfo "  $label ${secs}s" "MAIN"
        }
        $totalLabel = "TOTAL:".PadRight(42)
        $totalSecs  = [Math]::Round($totalDuration.TotalSeconds, 1)
        Write-DeployInfo "  $totalLabel ${totalSecs}s" "MAIN"
        Write-DeployInfo "=============================================" "MAIN"
    }
}

function Invoke-FullDeployment {
    param([bool]$BuildFirst = $true)
    
    Write-DeployInfo "=== DEPLOYMENT COMPLETO ===" "MAIN"
    
    $results = @{
        Frontend = $false
        Backend = $false
        Nginx = $false
    }
    
    # Usar o novo wrapper para executar a ação
    return Invoke-WithMaintenance -OperationName "Deployment Completo" -Action {
        param($BuildFirstParam)

        $frontendOk = Deploy-Frontend -BuildFirst $BuildFirstParam
        if (-not $frontendOk) { return $false }

        $backendOk = Deploy-Backend
        if (-not $backendOk) { return $false }

        $nginxOk = Deploy-NginxConfig
        return $nginxOk

    } -ArgumentList @($BuildFirst)
}

function Invoke-FrontendBackendDeployment {
    param([bool]$BuildFirst = $true)
    
    Write-DeployInfo "=== DEPLOYMENT FRONTEND + BACKEND ===" "MAIN"
    
    return Invoke-WithMaintenance -OperationName "Deployment Frontend + Backend" -Action {
        param($BuildFirstParam)

        $frontendOk = Deploy-Frontend -BuildFirst $BuildFirstParam
        if (-not $frontendOk) { return $false }

        $backendOk = Deploy-Backend
        return $backendOk

    } -ArgumentList @($BuildFirst)
}

function Invoke-FrontendDeployment {
    param([bool]$BuildFirst = $true)
    return Invoke-WithMaintenance -OperationName "Deployment Frontend" -Action {
        param($BuildFirstParam)
        return Deploy-Frontend -BuildFirst $BuildFirstParam
    } -ArgumentList @($BuildFirst)
}

function Invoke-BackendDeployment {
    return Invoke-WithMaintenance -OperationName "Deployment Backend" -Action {
        return Deploy-Backend
    }
}

function Invoke-NginxDeployment {
    return Invoke-WithMaintenance -OperationName "Deployment Configuração Nginx" -Action {
        return Deploy-NginxConfig
    }
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