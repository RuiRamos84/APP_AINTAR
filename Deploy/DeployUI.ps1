# DeployUI.ps1
# Interface de usuário para o sistema de deployment
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CLASSE DE INTERFACE DO USUÁRIO
# ============================================================================

class DeploymentUI {
    [bool]$ColorSupport
    [string]$Title
    
    DeploymentUI() {
        $this.ColorSupport = $true
        $this.Title = "SISTEMA DE DEPLOYMENT WEB APP"
    }
    
    [void] ShowHeader() {
        Clear-Host
        $this.WriteColorLine("=" * 50, "Cyan")
        $this.WriteColorLine("   $($this.Title)   ", "Cyan")
        $this.WriteColorLine("=" * 50, "Cyan")
        Write-Host ""
    }
    
    [void] WriteColorLine([string]$text, [string]$color) {
        if ($this.ColorSupport) {
            Write-Host $text -ForegroundColor $color
        } else {
            Write-Host $text
        }
    }
    
    [void] ShowMenu() {
        $this.ShowHeader()
        
        $this.WriteColorLine("Escolha uma opção:", "Yellow")
        Write-Host ""
        
        $menuItems = @(
            @{Number="1"; Text="Deployment Completo (Frontend + Backend + Nginx)"; Color="Green"},
            @{Number="2"; Text="Deployment Frontend (com build)"; Color="Green"},
            @{Number="3"; Text="Deployment Frontend SEM BUILD (usar build existente)"; Color="Green"},
            @{Number="4"; Text="Deployment apenas do Backend"; Color="Green"},
            @{Number="5"; Text="Deployment Frontend + Backend (sem Nginx)"; Color="Green"},
            @{Number="6"; Text="Criar/Atualizar apenas configuração Nginx"; Color="Green"},
            @{Number="7"; Text="Ver estado dos arquivos"; Color="Green"},
            @{Number="8"; Text="Informações do sistema"; Color="Blue"},
            @{Number="9"; Text="DIAGNOSTICO - Testar conectividade"; Color="Blue"},
            @{Number="10"; Text="DIAGNOSTICO - Ver estrutura do servidor"; Color="Blue"},
            @{Number="11"; Text="Configurações avançadas"; Color="Magenta"},
            @{Number="0"; Text="Sair"; Color="Red"}
        )
        
        foreach ($item in $menuItems) {
            $this.WriteColorLine("$($item.Number). ", $item.Color)
            Write-Host $item.Text
        }
        
        Write-Host ""
    }
    
    [void] ShowStatus([string]$message, [string]$type = "Info") {
        $color = switch ($type) {
            "Success" { "Green" }
            "Warning" { "Yellow" }
            "Error" { "Red" }
            "Info" { "Cyan" }
            default { "White" }
        }
        
        $prefix = switch ($type) {
            "Success" { "[OK]" }
            "Warning" { "[!]" }
            "Error" { "[X]" }
            "Info" { "[i]" }
            default { "[?]" }
        }
        
        $this.WriteColorLine("$prefix $message", $color)
    }
    
    [void] ShowFileStatus() {
        $this.ShowHeader()
        $this.WriteColorLine("ESTADO DOS ARQUIVOS", "Cyan")
        $this.WriteColorLine("=" * 50, "Cyan")
        Write-Host ""
        
        # Frontend local
        $frontendInfo = Get-FrontendBuildInfo
        Write-Host "Frontend Local:" -ForegroundColor Yellow
        if ($frontendInfo.LocalBuildExists) {
            $this.ShowStatus("Build existe: $($frontendInfo.LocalBuildPath)", "Success")
            $this.ShowStatus("Arquivos: $($frontendInfo.LocalFileCount)", "Info")
            $this.ShowStatus("Tamanho: $([Math]::Round($frontendInfo.LocalBuildSize / 1MB, 2)) MB", "Info")
            if ($frontendInfo.LastBuildTime) {
                $this.ShowStatus("Última modificação: $($frontendInfo.LastBuildTime)", "Info")
            }
        } else {
            $this.ShowStatus("Build não encontrado", "Error")
        }
        
        Write-Host ""
        
        # Backend local
        $backendInfo = Get-BackendDeploymentInfo
        Write-Host "Backend Local:" -ForegroundColor Yellow
        if ($backendInfo.LocalExists) {
            $this.ShowStatus("Diretório existe: $($backendInfo.LocalPath)", "Success")
            $this.ShowStatus("Arquivos: $($backendInfo.LocalFileCount)", "Info")
            $this.ShowStatus("Arquivos Python: $($backendInfo.LocalPythonFiles)", "Info")
        } else {
            $this.ShowStatus("Diretório não encontrado", "Error")
        }
        
        Write-Host ""
        
        # Informações remotas
        Write-Host "Servidor Remoto:" -ForegroundColor Yellow
        if (Test-DeployConnection) {
            $this.ShowStatus("Conectado ao servidor", "Success")
            
            if ($backendInfo.RemoteExists) {
                $this.ShowStatus("Backend remoto existe", "Success")
                $this.ShowStatus("Arquivos remotos: $($backendInfo.RemoteFileCount)", "Info")
            } else {
                $this.ShowStatus("Backend remoto não encontrado", "Warning")
            }
        } else {
            $this.ShowStatus("Não conectado - tentando conectar...", "Warning")
            
            if (Connect-DeployServer) {
                $this.ShowStatus("Conexão estabelecida!", "Success")
                
                # Reobter informações com conexão ativa
                $backendInfo = Get-BackendDeploymentInfo
                if ($backendInfo.RemoteExists) {
                    $this.ShowStatus("Backend remoto existe", "Success")
                } else {
                    $this.ShowStatus("Backend remoto não encontrado", "Warning")
                }
                
                Disconnect-DeployServer
            } else {
                $this.ShowStatus("Falha ao conectar ao servidor", "Error")
            }
        }
        
        Write-Host ""
        $this.PauseForUser()
    }
    
    [void] ShowSystemInfo() {
        $this.ShowHeader()
        $this.WriteColorLine("INFORMAÇÕES DO SISTEMA", "Cyan")
        $this.WriteColorLine("=" * 50, "Cyan")
        Write-Host ""
        
        # Configurações
        Write-Host "Configurações:" -ForegroundColor Yellow
        $this.ShowStatus("Servidor: $($Global:DeployConfig.ServerIP)", "Info")
        $this.ShowStatus("Compartilhamento: $($Global:DeployConfig.CompartilhamentoNome)", "Info")
        $this.ShowStatus("Usuário: $($Global:DeployConfig.Usuario)", "Info")
        $this.ShowStatus("Backup habilitado: $($Global:DeployConfig.CriarBackup)", "Info")
        $this.ShowStatus("Verbose logging: $($Global:DeployConfig.VerboseLogging)", "Info")
        
        Write-Host ""
        
        # Validar configurações
        Write-Host "Validação das Configurações:" -ForegroundColor Yellow
        $configErrors = Test-DeployConfig
        if ($configErrors.Count -eq 0) {
            $this.ShowStatus("Todas as configurações estão válidas", "Success")
        } else {
            foreach ($error in $configErrors) {
                $this.ShowStatus($error, "Error")
            }
        }
        
        Write-Host ""
        
        # Informações do Nginx
        Write-Host "Nginx:" -ForegroundColor Yellow
        $nginxInfo = Get-NginxConfigInfo
        $this.ShowStatus("Domínio: $($nginxInfo.Domain)", "Info")
        $this.ShowStatus("Porta backend: $($nginxInfo.BackendPort)", "Info")
        $this.ShowStatus("Caminho SSL cert: $($nginxInfo.SSLCertPath)", "Info")
        
        Write-Host ""
        $this.PauseForUser()
    }
    
    [void] ShowConnectivityTest() {
        $this.ShowHeader()
        $this.WriteColorLine("TESTE DE CONECTIVIDADE", "Cyan")
        $this.WriteColorLine("=" * 50, "Cyan")
        Write-Host ""
        
        $results = Test-ServerConnectivity
        
        # Exibir resultados
        Write-Host "Conectividade de Rede:" -ForegroundColor Yellow
        if ($results.NetworkReachable) {
            $this.ShowStatus("Servidor acessível na porta 445", "Success")
        } else {
            $this.ShowStatus("Servidor não acessível na porta 445", "Error")
        }
        
        Write-Host ""
        Write-Host "Acesso ao Compartilhamento:" -ForegroundColor Yellow
        if ($results.ShareAccessible) {
            $this.ShowStatus("Compartilhamento acessível", "Success")
            $this.ShowStatus("Credenciais válidas", "Success")
        } else {
            $this.ShowStatus("Falha ao acessar compartilhamento", "Error")
        }
        
        Write-Host ""
        if ($results.PathsExist.Count -gt 0) {
            Write-Host "Estrutura de Caminhos:" -ForegroundColor Yellow
            foreach ($path in $results.PathsExist.Keys) {
                $status = if ($results.PathsExist[$path]) { "Success" } else { "Warning" }
                $message = if ($results.PathsExist[$path]) { "existe" } else { "não existe" }
                $this.ShowStatus("$path : $message", $status)
            }
        }
        
        Write-Host ""
        $this.PauseForUser()
    }
    
    [void] ShowServerStructure() {
        $this.ShowHeader()
        $this.WriteColorLine("ESTRUTURA DO SERVIDOR", "Cyan")
        $this.WriteColorLine("=" * 50, "Cyan")
        Write-Host ""
        
        $this.ShowStatus("Conectando ao servidor...", "Info")
        
        # USAR O SISTEMA MODULAR:
        Invoke-WithServerConnection -ScriptBlock {
            try {
                # Verificar drives disponíveis primeiro:
                Write-Host "Drives activos:"
                Get-PSDrive | Format-Table Name, Root

                # Depois usar o drive correcto:
                $driveName = if (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue) { "ServerDrive:" } else { $Global:DeployConfig.Compartilhamento }
                $rootItems = Get-ChildItem $driveName -ErrorAction Stop | Sort-Object -Property @('PSIsContainer','Name') -Descending
                                foreach ($item in $rootItems) {
                    $type = if ($item.PSIsContainer) { "[PASTA]" } else { "[ARQUIVO]" }
                    Write-Host "  $type $($item.Name)" -ForegroundColor $(if ($item.PSIsContainer) { "Cyan" } else { "White" })
                }
                
                Write-Host ""
                
                # Mostrar NewAPP se existir
                $newAppPath = "$driveName\NewAPP"
                if (Test-Path $newAppPath) {
                    Write-Host "Estrutura NewAPP:" -ForegroundColor Yellow
                    $Global:UI.ShowDirectoryStructure($newAppPath, 1, 3)
                } else {
                    $Global:UI.ShowStatus("Directorio NewAPP nao encontrado", "Warning")
                }
                Write-Host ""
                $Global:UI.ShowStatus("Exploração do servidor concluída com sucesso!", "Success")   
                $Global:UI.PauseForUser()
                # Retornar sucesso                
                return $true
            }
            catch {
                $Global:UI.ShowStatus("Erro ao explorar servidor: $($_.Exception.Message)", "Error")
                return $false
            }
        } -OperationName "Explorar Servidor" -DisconnectAfter $true
        
        Write-Host ""
        $this.PauseForUser()
    }
    
    [void] ShowDirectoryStructure([string]$path, [int]$currentDepth, [int]$maxDepth) {
        if ($currentDepth -gt $maxDepth) {
            return
        }
        
        try {
            $items = Get-ChildItem $path | Sort-Object -Property @('PSIsContainer','Name') -Descending
            $indent = "  " * $currentDepth
            
            foreach ($item in $items) {
                if ($item -is [System.IO.FileSystemInfo]) {
                    $type = if ($item.PSIsContainer) { "[PASTA]" } else { "[ARQUIVO]" }
                    $color = if ($item.PSIsContainer) { "Cyan" } else { "White" }
                    Write-Host "$indent$type $($item.Name)" -ForegroundColor $color

                    # Recursão para subdiretórios
                    if ($item.PSIsContainer -and $currentDepth -lt $maxDepth) {
                        $this.ShowDirectoryStructure($item.FullName, $currentDepth + 1, $maxDepth)
                    }
                } else {
                    Write-Host "$indent[ARQUIVO] $item" -ForegroundColor White
                }
            }
        }
        catch {
            $indent = "  " * $currentDepth
            Write-Host "$indent[ERRO: $($_.Exception.Message)]" -ForegroundColor Red
        }
    }
    
    [void] ShowAdvancedSettings() {
        do {
            $this.ShowHeader()
            $this.WriteColorLine("CONFIGURAÇÕES AVANÇADAS", "Magenta")
            $this.WriteColorLine("=" * 50, "Magenta")
            Write-Host ""
            
            Write-Host "1. Mostrar exclusões do backend" -ForegroundColor Green
            Write-Host "2. Mostrar configuração do Nginx (gerada)" -ForegroundColor Green
            Write-Host "3. Mostrar configuração do Nginx (remota)" -ForegroundColor Green
            Write-Host "4. Testar sintaxe do Nginx remoto" -ForegroundColor Green
            Write-Host "5. Ver logs de deployment" -ForegroundColor Green
            Write-Host "6. Limpar logs antigos" -ForegroundColor Green
            Write-Host "0. Voltar ao menu principal" -ForegroundColor Red
            Write-Host ""
            
            $choice = Read-Host "Escolha uma opção"
            
            switch ($choice) {
                "1" {
                    $exclusions = Get-BackendExclusions
                    Write-Host "`nPastas excluídas:" -ForegroundColor Yellow
                    $exclusions.ExcludedFolders | ForEach-Object { Write-Host "  - $_" }
                    Write-Host "`nArquivos excluídos:" -ForegroundColor Yellow
                    $exclusions.ExcludedFiles | ForEach-Object { Write-Host "  - $_" }
                    $this.PauseForUser()
                }
                "2" {
                    Show-NginxConfig -ShowRemote $false
                    $this.PauseForUser()
                }
                "3" {
                    Show-NginxConfig -ShowRemote $true
                    $this.PauseForUser()
                }
                "4" {
                    Write-Host "`nTestando sintaxe do Nginx..." -ForegroundColor Yellow
                    $result = Test-NginxConfig
                    if ($result) {
                        $this.ShowStatus("Sintaxe do Nginx válida!", "Success")
                    } else {
                        $this.ShowStatus("Problemas encontrados na sintaxe", "Error")
                    }
                    $this.PauseForUser()
                }
                "5" {
                    if (Test-Path $Global:DeployConfig.LogFile) {
                        Write-Host "`nÚltimas 50 linhas do log:" -ForegroundColor Yellow
                        Get-Content $Global:DeployConfig.LogFile -Tail 50 | Write-Host
                    } else {
                        $this.ShowStatus("Arquivo de log não encontrado", "Warning")
                    }
                    $this.PauseForUser()
                }
                "6" {
                    if (Test-Path $Global:DeployConfig.LogFile) {
                        $response = Read-Host "Confirma a limpeza dos logs? (s/N)"
                        if ($response.ToLower() -eq 's') {
                            Remove-Item $Global:DeployConfig.LogFile -ErrorAction SilentlyContinue
                            $this.ShowStatus("Logs limpos com sucesso!", "Success")
                        }
                    } else {
                        $this.ShowStatus("Nenhum log para limpar", "Info")
                    }
                    $this.PauseForUser()
                }
                "0" {
                    return
                }
                default {
                    $this.ShowStatus("Opção inválida!", "Error")
                    Start-Sleep -Seconds 1
                }
            }
        } while ($true)
    }
    
    [void] PauseForUser() {
        Write-Host ""
        Read-Host "Prima Enter para continuar"
    }
    
    [string] GetUserChoice() {
        return Read-Host "Digite a opção desejada"
    }
    
    [bool] ConfirmAction([string]$message) {
        $response = Read-Host "$message (s/N)"
        return ($response.ToLower() -eq 's' -or $response.ToLower() -eq 'sim')
    }
}

# ============================================================================
# INSTÂNCIA GLOBAL DA UI
# ============================================================================

$Global:UI = [DeploymentUI]::new()

# ============================================================================
# FUNÇÕES PÚBLICAS DA UI
# ============================================================================

function Show-DeployMenu {
    $Global:UI.ShowMenu()
}

function Show-DeployStatus {
    param([string]$Message, [string]$Type = "Info")
    $Global:UI.ShowStatus($Message, $Type)
}

function Show-FileStatus {
    $Global:UI.ShowFileStatus()
}

function Show-SystemInfo {
    $Global:UI.ShowSystemInfo()
}

function Show-ConnectivityTest {
    $Global:UI.ShowConnectivityTest()
}

function Show-ServerStructure {
    $Global:UI.ShowServerStructure()
}

function Show-AdvancedSettings {
    $Global:UI.ShowAdvancedSettings()
}

function Get-UserChoice {
    return $Global:UI.GetUserChoice()
}

function Confirm-Action {
    param([string]$Message)
    return $Global:UI.ConfirmAction($Message)
}