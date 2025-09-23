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
    "DeployUI.ps1"
)

Write-Host "Inicializando Sistema de Deployment Modular..." -ForegroundColor Cyan
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
        Write-DeployDebug "Validando configuracoes..." "SYSTEM"
        $configErrors = Test-DeployConfig
        
        if ($configErrors.Count -gt 0) {
            Write-DeployError "Erros de configuracao encontrados:" "SYSTEM"
            foreach ($error in $configErrors) {
                Write-DeployError "  - $error" "SYSTEM"
            }
            return $false
        }
        
        Write-DeployInfo "Configuracoes validadas com sucesso" "SYSTEM"
        
        # Inicializar conexao (sem conectar ainda)
        if (-not (Initialize-ServerConnection)) {
            Write-DeployError "Falha ao inicializar gestor de conexoes" "SYSTEM"
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

function Invoke-FullDeployment {
    param([bool]$BuildFirst = $true)
    
    Write-DeployInfo "=== DEPLOYMENT COMPLETO ===" "MAIN"
    
    $results = @{
        Frontend = $false
        Backend = $false
        Nginx = $false
    }
    
    try {
        # Frontend
        Write-DeployInfo "Iniciando deployment do frontend..." "MAIN"
        $results.Frontend = Deploy-Frontend -BuildFirst $BuildFirst
        
        if (-not $results.Frontend) {
            Write-DeployError "Falha no deployment do frontend" "MAIN"
            return $false
        }
        
        # Backend
        Write-DeployInfo "Iniciando deployment do backend..." "MAIN"
        $results.Backend = Deploy-Backend
        
        if (-not $results.Backend) {
            Write-DeployError "Falha no deployment do backend" "MAIN"
            return $false
        }
        
        # Nginx
        Write-DeployInfo "Iniciando deployment da configuracao Nginx..." "MAIN"
        $results.Nginx = Deploy-NginxConfig
        
        if (-not $results.Nginx) {
            Write-DeployError "Falha no deployment da configuracao Nginx" "MAIN"
            return $false
        }
        
        Write-DeployInfo "=== DEPLOYMENT COMPLETO FINALIZADO COM SUCESSO ===" "MAIN"
        return $true
    }
    catch {
        Write-DeployException $_.Exception "Deployment completo" "MAIN"
        return $false
    }
}

function Invoke-FrontendBackendDeployment {
    param([bool]$BuildFirst = $true)
    
    Write-DeployInfo "=== DEPLOYMENT FRONTEND + BACKEND ===" "MAIN"
    
    try {
        # Frontend
        $frontendResult = Deploy-Frontend -BuildFirst $BuildFirst
        
        # Backend
        $backendResult = Deploy-Backend
        
        $success = $frontendResult -and $backendResult
        
        if ($success) {
            Write-DeployInfo "=== DEPLOYMENT FRONTEND + BACKEND FINALIZADO COM SUCESSO ===" "MAIN"
        } else {
            Write-DeployError "=== DEPLOYMENT FRONTEND + BACKEND FINALIZADO COM ERROS ===" "MAIN"
        }
        
        return $success
    }
    catch {
        Write-DeployException $_.Exception "Deployment Frontend + Backend" "MAIN"
        return $false
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
    
    Write-DeployInfo "Executando em modo nao interativo: $Operation" "MAIN"
    
    $result = $false
    
    switch ($Operation.ToLower()) {
        "full" {
            $result = Invoke-FullDeployment -BuildFirst $BuildFirst
        }
        "frontend" {
            $result = Deploy-Frontend -BuildFirst $BuildFirst
        }
        "frontend-nobuild" {
            $result = Deploy-Frontend -BuildFirst $false
        }
        "backend" {
            $result = Deploy-Backend
        }
        "frontend-backend" {
            $result = Invoke-FrontendBackendDeployment -BuildFirst $BuildFirst
        }
        "nginx" {
            $result = Deploy-NginxConfig
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
            Write-DeployError "Operacao nao reconhecida: $Operation" "MAIN"
            Write-DeployInfo "Operacoes disponiveis: full, frontend, frontend-nobuild, backend, frontend-backend, nginx, test-connection, build-only, validate-build" "MAIN"
            return $false
        }
    }
    
    if ($result) {
        Write-DeployInfo "Operacao '$Operation' concluida com sucesso!" "MAIN"
        exit 0
    } else {
        Write-DeployError "Operacao '$Operation' falhou!" "MAIN"
        exit 1
    }
}

# ============================================================================  
# MODO INTERATIVO  
# ============================================================================  

function Start-InteractiveMode {
    Write-DeployInfo "Iniciando modo interativo" "MAIN"    

    $menuActions = @{
        "1" = @{ Name = "Deployment Completo (Frontend + Backend + Nginx)"; Action = { Invoke-FullDeployment -BuildFirst $true } }
        "2" = @{ Name = "Deployment Frontend (com build)"; Action = { Deploy-Frontend -BuildFirst $true } }
        "3" = @{ Name = "Deployment Frontend (sem build)"; Action = { 
                if (-not (Test-FrontendBuild)) {
                    Show-DeployStatus "Build não encontrado ou inválido!" "Error"
                    if (Confirm-Action "Deseja fazer o build antes do deployment?") {
                        return Deploy-Frontend -BuildFirst $true
                    }
                    Show-DeployStatus "Deployment cancelado pelo usuário" "Warning"
                    return $null # Indica que nenhuma ação foi tomada
                }
                return Deploy-Frontend -BuildFirst $false
            } }
        "4" = @{ Name = "Deployment Backend"; Action = { Deploy-Backend } }
        "5" = @{ Name = "Deployment Frontend + Backend (sem Nginx)"; Action = { Invoke-FrontendBackendDeployment -BuildFirst $true } }
        "6" = @{ Name = "Deployment Configuração Nginx"; Action = { Deploy-NginxConfig } }
        "7" = @{ Name = "Ver ficheiros em estado relevante"; Action = { Show-FileStatus; return $null } }
        "8" = @{ Name = "Ver informações do sistema"; Action = { Show-SystemInfo; return $null } }
        "9" = @{ Name = "Testar conectividade com o servidor"; Action = { Show-ConnectivityTest; return $null } }
        "10" = @{ Name = "Mostrar estrutura do servidor"; Action = { Show-ServerStructure; return $null } }
        "11" = @{ Name = "Configurações avançadas"; Action = { Show-AdvancedSettings; return $null } }
    }

    while ($true) {
        Show-DeployMenu -MenuActions $menuActions
        $opcao = Get-UserChoice

        if ($opcao -eq "0") {
            Write-DeployInfo "Sistema finalizado pelo usuário" "MAIN"
            Show-DeployStatus "Encerrando sistema..." "Info"
            break
        }

        $menuItem = $menuActions[$opcao]
        if ($menuItem) {
            Write-DeployInfo "Iniciando: $($menuItem.Name)" "MAIN"
            Show-DeployStatus "Executando: $($menuItem.Name)..." "Info"
            
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
    $menuKeys = $MenuActions.Keys | Sort-Object { [int]$_ }

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