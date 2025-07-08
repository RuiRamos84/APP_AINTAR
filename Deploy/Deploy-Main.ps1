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
    
    do {
        Show-DeployMenu
        $opcao = Get-UserChoice
        
        Write-DeployDebug "Usuario selecionou opcao: $opcao" "MAIN"
        
        switch ($opcao) {
            "1" {
                Write-DeployInfo "Iniciando deployment completo..." "MAIN"
                Show-DeployStatus "Executando deployment completo (Frontend + Backend + Nginx)..." "Info"
                
                $result = Invoke-FullDeployment -BuildFirst $true
                
                if ($result) {
                    Show-DeployStatus "Deployment completo realizado com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Deployment completo falhou!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "2" {
                Write-DeployInfo "Iniciando deployment do frontend com build..." "MAIN"
                Show-DeployStatus "Executando deployment do frontend (com build)..." "Info"
                
                $result = Deploy-Frontend -BuildFirst $true
                
                if ($result) {
                    Show-DeployStatus "Deployment do frontend realizado com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Deployment do frontend falhou!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "3" {
                Write-DeployInfo "Iniciando deployment do frontend sem build..." "MAIN"
                Show-DeployStatus "Executando deployment do frontend (sem build)..." "Info"
                
                # Verificar se build existe
                if (-not (Test-FrontendBuild)) {
                    Show-DeployStatus "Build nao encontrado ou invalido!" "Error"
                    if (Confirm-Action "Deseja fazer o build antes do deployment?") {
                        $result = Deploy-Frontend -BuildFirst $true
                    } else {
                        Show-DeployStatus "Deployment cancelado pelo usuario" "Warning"
                        $Global:UI.PauseForUser()
                        continue
                    }
                } else {
                    $result = Deploy-Frontend -BuildFirst $false
                }
                
                if ($result) {
                    Show-DeployStatus "Deployment do frontend realizado com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Deployment do frontend falhou!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "4" {
                Write-DeployInfo "Iniciando deployment do backend..." "MAIN"
                Show-DeployStatus "Executando deployment do backend..." "Info"
                
                $result = Deploy-Backend
                
                if ($result) {
                    Show-DeployStatus "Deployment do backend realizado com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Deployment do backend falhou!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "5" {
                Write-DeployInfo "Iniciando deployment frontend + backend..." "MAIN"
                Show-DeployStatus "Executando deployment do frontend e backend..." "Info"
                
                $result = Invoke-FrontendBackendDeployment -BuildFirst $true
                
                if ($result) {
                    Show-DeployStatus "Deployment do frontend e backend realizado com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Deployment do frontend e backend falhou!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "6" {
                Write-DeployInfo "Iniciando deployment da configuracao Nginx..." "MAIN"
                Show-DeployStatus "Executando deployment da configuracao Nginx..." "Info"
                
                $result = Deploy-NginxConfig
                
                if ($result) {
                    Show-DeployStatus "Configuracao Nginx atualizada com sucesso!" "Success"
                } else {
                    Show-DeployStatus "Falha ao atualizar configuracao Nginx!" "Error"
                }
                
                $Global:UI.PauseForUser()
            }
            
            "7" {
                Show-FileStatus
            }
            
            "8" {
                Show-SystemInfo
            }
            
            "9" {
                Show-ConnectivityTest
            }
            
            "10" {
                Show-ServerStructure
            }
            
            "11" {
                Show-AdvancedSettings
            }
            
            "0" {
                Write-DeployInfo "Sistema finalizado pelo usuario" "MAIN"
                Show-DeployStatus "Encerrando sistema..." "Info"
                break
            }
            
            default {
                Show-DeployStatus "Opcao invalida!" "Error"
                Start-Sleep -Seconds 1
            }
        }
        
    } while ($opcao -ne "0")
}

# ============================================================================
# FUNCAO PRINCIPAL
# ============================================================================

function Main {
    param(
        [bool]$NonInteractive = $false,
        [string]$Operation = "",
        [bool]$BuildFirst = $false,
        [bool]$Verbose = $false,
        [bool]$SkipValidation = $false
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