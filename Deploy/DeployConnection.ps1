# DeployConnection.ps1
# Gestão de conexões ao servidor
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CLASSE DE GESTÃO DE CONEXÃO
# ============================================================================

class ServerConnection {
    [string]$DriveName
    [string]$ServerPath
    [System.Management.Automation.PSCredential]$Credential
    [bool]$IsConnected
    [datetime]$LastConnectionTime
    [int]$ConnectionAttempts
    
    ServerConnection([string]$driveName, [string]$serverPath, [System.Management.Automation.PSCredential]$credential) {
        $this.DriveName = $driveName
        $this.ServerPath = $serverPath
        $this.Credential = $credential
        $this.IsConnected = $false
        $this.ConnectionAttempts = 0
    }
    
    [bool] Connect() {
        return $this.Connect($Global:DeployConfig.MaxTentativasConexao)
    }
    
    [bool] Connect([int]$maxAttempts) {
        $this.ConnectionAttempts = 0
        
        while ($this.ConnectionAttempts -lt $maxAttempts) {
            $this.ConnectionAttempts++
            
            try {
                Write-DeployDebug "Tentativa de conexão $($this.ConnectionAttempts)/$maxAttempts" "CONNECTION"
                
                # Limpar conexão existente se houver
                $this.Disconnect($false)
                Start-Sleep -Seconds 1
                
                # Tentar nova conexão
                Write-DeployDebug "Conectando a: $($this.ServerPath)" "CONNECTION"
                New-PSDrive -Name $this.DriveName -PSProvider FileSystem -Root $this.ServerPath -Credential $this.Credential -ErrorAction Stop | Out-Null
                
                # Verificar se a conexão funciona
                Start-Sleep -Seconds 2
                $testDrive = Get-PSDrive -Name $this.DriveName -ErrorAction Stop
                $testContent = Get-ChildItem "$($this.DriveName):" -ErrorAction Stop | Select-Object -First 1
                
                $this.IsConnected = $true
                $this.LastConnectionTime = Get-Date
                
                Write-DeployInfo "Conexão estabelecida com sucesso: $($testDrive.Root)" "CONNECTION"
                return $true
            }
            catch {
                Write-DeployWarning "Tentativa $($this.ConnectionAttempts) falhou: $($_.Exception.Message)" "CONNECTION"
                
                if ($this.ConnectionAttempts -lt $maxAttempts) {
                    $waitTime = [Math]::Min(3 * $this.ConnectionAttempts, 10)
                    Write-DeployDebug "Aguardando $waitTime segundos antes da próxima tentativa..." "CONNECTION"
                    Start-Sleep -Seconds $waitTime
                }
            }
        }
        
        Write-DeployError "Falha ao estabelecer conexão após $maxAttempts tentativas" "CONNECTION"
        $this.IsConnected = $false
        return $false
    }
    
    [void] Disconnect() {
        $this.Disconnect($true)
    }
    
    [void] Disconnect([bool]$logResult) {
        try {
            $existingDrive = Get-PSDrive -Name $this.DriveName -ErrorAction SilentlyContinue
            if ($existingDrive) {
                Remove-PSDrive -Name $this.DriveName -Force -ErrorAction Stop
                if ($logResult) {
                    Write-DeployDebug "Drive $($this.DriveName) removido: $($existingDrive.Root)" "CONNECTION"
                }
            }
        }
        catch {
            if ($logResult) {
                Write-DeployWarning "Erro ao remover drive $($this.DriveName): $($_.Exception.Message)" "CONNECTION"
            }
        }
        finally {
            $this.IsConnected = $false
        }
    }
    
    [bool] TestConnection() {
        if (-not $this.IsConnected) {
            return $false
        }
        
        try {
            $testDrive = Get-PSDrive -Name $this.DriveName -ErrorAction Stop
            Get-ChildItem "$($this.DriveName):" -ErrorAction Stop | Select-Object -First 1 | Out-Null
            return $true
        }
        catch {
            Write-DeployWarning "Conexão perdida: $($_.Exception.Message)" "CONNECTION"
            $this.IsConnected = $false
            return $false
        }
    }
    
    [string] GetFullPath([string]$relativePath) {
        return "$($this.DriveName):$relativePath"
    }
}

# ============================================================================
# INSTÂNCIA GLOBAL DE CONEXÃO
# ============================================================================

$Global:ServerConnection = $null

function Initialize-ServerConnection {
    $credential = Get-DeployCredential
    if ($null -eq $credential) {
        Write-DeployError "Falha ao carregar credenciais" "CONNECTION"
        return $false
    }
    
    $Global:ServerConnection = [ServerConnection]::new(
        "ServerDrive",
        "\\172.16.2.35\app",  # Deve ser o caminho UNC do servidor
        $credential
    )
    
    Write-DeployInfo "Gestor de conexão inicializado" "CONNECTION"
    return $true
}

function Connect-DeployServer {
    if ($null -eq $Global:ServerConnection) {
        if (-not (Initialize-ServerConnection)) {
            return $false
        }
    }
    
    return $Global:ServerConnection.Connect()
}

function Disconnect-DeployServer {
    if ($null -ne $Global:ServerConnection) {
        $Global:ServerConnection.Disconnect()
    }
}

function Test-DeployConnection {
    if ($null -eq $Global:ServerConnection) {
        return $false
    }
    
    return $Global:ServerConnection.TestConnection()
}

function Get-DeployServerPath {
    param([string]$RelativePath = "")
    
    if ($null -eq $Global:ServerConnection -or -not $Global:ServerConnection.IsConnected) {
        Write-DeployError "Nenhuma conexão ativa com o servidor" "CONNECTION"
        return $null
    }
    
    return $Global:ServerConnection.GetFullPath($RelativePath)
}

# ============================================================================
# FUNÇÃO PARA EXECUÇÃO COM CONEXÃO AUTOMÁTICA
# ============================================================================

function Invoke-WithServerConnection {
    param(
        [Parameter(Mandatory=$true)][ScriptBlock]$ScriptBlock,
        [string]$OperationName = "Operação",
        [bool]$DisconnectAfter = $true
    )
    
    Write-DeployInfo "Iniciando: $OperationName" "CONNECTION"
    
    try {
        # Conectar se necessário
        if (-not (Test-DeployConnection)) {
            if (-not (Connect-DeployServer)) {
                Write-DeployError "Falha ao conectar ao servidor para: $OperationName" "CONNECTION"
                return $false
            }
        }
        
        # Executar operação
        $result = & $ScriptBlock
        
        Write-DeployInfo "$OperationName $(if ($result) { 'concluída com sucesso' } else { 'concluída com erros' })" "CONNECTION"
        return $result
    }
    catch {
        Write-DeployException $_.Exception "$OperationName" "CONNECTION"
        return $false
    }
    finally {
        if ($DisconnectAfter) {
            Disconnect-DeployServer
        }
    }
}

# ============================================================================
# FUNÇÕES DE DIAGNÓSTICO DE CONEXÃO
# ============================================================================

function Test-ServerConnectivity {
    param([int]$MaxAttempts = 3)
    
    Write-DeployInfo "Testando conectividade do servidor..." "DIAGNOSTIC"
    
    $results = @{
        NetworkReachable = $false
        ShareAccessible = $false
        CredentialsValid = $false
        PathsExist = @{}
    }

    # 1. Teste de rede
    try {
        $pingResult = Test-NetConnection -ComputerName $Global:DeployConfig.ServerIP -Port 445 -WarningAction SilentlyContinue
        $results.NetworkReachable = $pingResult.TcpTestSucceeded
        Write-DeployInfo "Teste de rede: $(if ($results.NetworkReachable) { 'Sucesso' } else { 'Falha' })" "DIAGNOSTIC"
    }
    catch {
        Write-DeployWarning "Erro no teste de rede: $($_.Exception.Message)" "DIAGNOSTIC"
    }

    # 2. Teste de compartilhamento (MODIFICADO)
    if ($results.NetworkReachable) {
        try {
            # Usando caminho UNC direto em vez de PSDrive
            $testPath = "\\$($Global:DeployConfig.ServerIP)\$($Global:DeployConfig.CompartilhamentoNome)\NewAPP"
            if (Test-Path $testPath) {
                $results.ShareAccessible = $true
                $results.CredentialsValid = $true
                
                # Definir caminhos críticos com UNC completo
                $criticalPaths = @{
                    "Backend" = "$testPath\backend"
                    "Nginx" = "$testPath\nginx"
                    "Frontend" = "$testPath\nginx\html\react-app"
                    "NewAPP" = $testPath
                }
                
                foreach ($pathName in $criticalPaths.Keys) {
                    $results.PathsExist[$pathName] = Test-Path $criticalPaths[$pathName]
                    Write-DeployDebug "Caminho $pathName : $(if ($results.PathsExist[$pathName]) { 'Existe' } else { 'Não existe' })" "DIAGNOSTIC"
                }
            }
            Write-DeployInfo "Teste de compartilhamento: $(if ($results.ShareAccessible) { 'Sucesso' } else { 'Falha' })" "DIAGNOSTIC"
        }
        catch {
            Write-DeployWarning "Erro no teste de compartilhamento: $($_.Exception.Message)" "DIAGNOSTIC"
        }
    }
    
    return $results
}

function Show-CurrentPaths {
    $paths = @{
        "CaminhoRemotoApp" = $Global:DeployConfig.CaminhoRemotoApp
        "CaminhoRemotoFrontend" = $Global:DeployConfig.CaminhoRemotoFrontend
        "CaminhoRemotoBackend" = $Global:DeployConfig.CaminhoRemotoBackend
        "CaminhoRemotoNginxConf" = $Global:DeployConfig.CaminhoRemotoNginxConf
    }
    
    Write-Host "`n[Configuração Atual de Caminhos]" -ForegroundColor Cyan
    foreach ($key in $paths.Keys) {
        Write-Host "$key : $($paths[$key])" -ForegroundColor Yellow
    }
}