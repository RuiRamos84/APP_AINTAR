# DeployConfig.ps1
# Configuracoes centralizadas do sistema de deployment
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CONFIGURACOES GLOBAIS
# ============================================================================

# Configurar encoding para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Global:OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================================================
# CONFIGURACOES DE SERVIDOR
# ============================================================================

$Global:DeployConfig = @{
    # Credenciais e servidor
    Usuario = "aintar\rui.ramos"
    PasswordFile = "C:\Users\rui.ramos\Desktop\APP\PServ.txt"
    ServerIP = "172.16.2.35"
    CompartilhamentoNome = "app"
    
    # Caminhos locais
    CaminhoLocalFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend\build"
    CaminhoLocalBackend = "C:\Users\rui.ramos\Desktop\APP\backend"
    CaminhoProjetoFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend"
    
    # Estrutura remota
    CaminhoRemotoApp = "\\172.16.2.35\app"
    
    # Timeouts e tentativas
    MaxTentativasConexao = 3
    TimeoutConexao = 5
    TimeoutOperacao = 30
    
    # Configuracoes de backup
    CriarBackup = $true
    ManterBackups = 5
    
    # Debug e logging
    VerboseLogging = $true
    LogFile = "C:\Users\rui.ramos\Desktop\APP\deployment.log"
}

# ============================================================================
# CAMINHOS DERIVADOS
# ============================================================================

$Global:DeployConfig.CaminhoRemotoApp = "ServerDrive:\NewAPP"
$Global:DeployConfig.CaminhoRemotoFrontend = "ServerDrive:\NewAPP\nginx\html\react-app\build"
$Global:DeployConfig.CaminhoRemotoBackend = "ServerDrive:\NewAPP\backend"
$Global:DeployConfig.CaminhoRemotoNginxConf = "ServerDrive:\NewAPP\nginx\conf\nginx.conf"

# ============================================================================
# VALIDACAO DE CONFIGURACOES
# ============================================================================

function Test-DeployConfig {
    $errors = @()
    
    # Verificar ficheiro de password
    if (-not (Test-Path $Global:DeployConfig.PasswordFile)) {
        $errors += "Ficheiro de password nao encontrado: $($Global:DeployConfig.PasswordFile)"
    }
    
    # Verificar caminhos locais criticos
    if (-not (Test-Path $Global:DeployConfig.CaminhoProjetoFrontend)) {
        $errors += "Diretorio do projeto frontend nao encontrado: $($Global:DeployConfig.CaminhoProjetoFrontend)"
    }
    
    if (-not (Test-Path $Global:DeployConfig.CaminhoLocalBackend)) {
        $errors += "Diretorio do backend nao encontrado: $($Global:DeployConfig.CaminhoLocalBackend)"
    }
    
    return $errors
}

# ============================================================================
# FUNCOES DE UTILIDADE
# ============================================================================

function Get-DeployCredential {
    try {
        $pass = Get-Content $Global:DeployConfig.PasswordFile | ConvertTo-SecureString
        return New-Object System.Management.Automation.PSCredential -ArgumentList $Global:DeployConfig.Usuario, $pass
    }
    catch {
        Write-Error "Erro ao carregar credenciais: $($_.Exception.Message)"
        return $null
    }
}

function Get-BackupPath {
    param([string]$BasePath)
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return "$BasePath-backup-$timestamp"
}