# DeployConfig.ps1
# Configurações centralizadas do sistema de deployment
# Versão: 2.0
# Autor: Sistema Modular
# Data: 2025-10-13

# ============================================================================
# CONFIGURAÇÕES GLOBAIS
# ============================================================================

# Configurar encoding para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Global:OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================================================
# CONFIGURAÇÕES DE SERVIDOR E CREDENCIAIS
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

    # Estrutura remota (via compartilhamento de rede)
    CaminhoRemotoApp = "\\172.16.2.35\app"

    # Timeouts e tentativas
    MaxTentativasConexao = 3
    TimeoutConexao = 5
    TimeoutOperacao = 30

    # Configurações de backup
    CriarBackup = $true
    ManterBackups = 5

    # Debug e logging
    VerboseLogging = $true
    LogFile = "C:\Users\rui.ramos\Desktop\APP\deployment.log"
}

# ============================================================================
# CONFIGURAÇÕES DE GESTÃO REMOTA (Task Scheduler)
# ============================================================================

$Global:DeployConfig.RemoteManagement = @{
    # Processo do backend
    BackendProcessName = "python"  # Nome do processo a parar (ex: python, waitress-serve, node)
    BackendStartScriptPath = "D:\APP\NewAPP\backend\start.bat"  # Caminho no servidor remoto

    # Mostrar janela do backend ao iniciar
    # $true  -> Abre janela visível com logs (ideal para DEBUG/DESENVOLVIMENTO)
    # $false -> Roda em background sem janela (ideal para PRODUÇÃO)
    ShowBackendWindow = $true
}

# ============================================================================
# CAMINHOS DERIVADOS (Automáticos via ServerDrive)
# ============================================================================

# Estes caminhos são construídos automaticamente após conectar ao servidor
$Global:DeployConfig.CaminhoRemotoFrontend = "ServerDrive:\NewAPP\nginx\html\react-app\build"
$Global:DeployConfig.CaminhoRemotoBackend = "ServerDrive:\NewAPP\backend"
$Global:DeployConfig.CaminhoRemotoNginxConf = "ServerDrive:\NewAPP\nginx\conf\nginx.conf"

# ============================================================================
# VALIDAÇÃO DE CONFIGURAÇÕES
# ============================================================================

function Test-DeployConfig {
    <#
    .SYNOPSIS
        Valida as configurações do sistema de deployment
    .DESCRIPTION
        Verifica se todos os arquivos e diretórios necessários existem
    .OUTPUTS
        Array de strings com erros encontrados (vazio se tudo OK)
    #>

    $errors = @()

    # Verificar ficheiro de password
    if (-not (Test-Path $Global:DeployConfig.PasswordFile)) {
        $errors += "Ficheiro de password não encontrado: $($Global:DeployConfig.PasswordFile)"
    }

    # Verificar caminhos locais críticos
    if (-not (Test-Path $Global:DeployConfig.CaminhoProjetoFrontend)) {
        $errors += "Diretório do projeto frontend não encontrado: $($Global:DeployConfig.CaminhoProjetoFrontend)"
    }

    if (-not (Test-Path $Global:DeployConfig.CaminhoLocalBackend)) {
        $errors += "Diretório do backend não encontrado: $($Global:DeployConfig.CaminhoLocalBackend)"
    }

    return $errors
}

# ============================================================================
# FUNÇÕES DE UTILIDADE
# ============================================================================

function Get-DeployCredential {
    <#
    .SYNOPSIS
        Carrega as credenciais do arquivo de senha
    .DESCRIPTION
        Lê o arquivo de senha encriptado e cria um objeto PSCredential
    .OUTPUTS
        PSCredential ou $null se falhar
    #>

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
    <#
    .SYNOPSIS
        Gera um caminho de backup com timestamp
    .PARAMETER BasePath
        Caminho base para adicionar sufixo de backup
    .OUTPUTS
        String com o caminho de backup (ex: "caminho-backup-20251013-140530")
    #>

    param([string]$BasePath)
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return "$BasePath-backup-$timestamp"
}
