# DeployBackend.ps1
# Módulo de deployment do backend
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CLASSE DE DEPLOYMENT BACKEND
# ============================================================================

class BackendDeployer {
    [string]$LocalPath
    [string]$RemotePath
    [string[]]$ExcludedFolders
    [string[]]$ExcludedFiles
    [bool]$CreateBackup
    
    BackendDeployer() {
        if (-not $Global:DeployConfig.CaminhoLocalBackend) {
            throw "CaminhoLocalBackend não está definido!"
        }
        if (-not $Global:DeployConfig.CaminhoRemotoBackend) {
            throw "CaminhoRemotoBackend não está definido!"
        }
        $this.LocalPath = $Global:DeployConfig.CaminhoLocalBackend
        $this.RemotePath = $Global:DeployConfig.CaminhoRemotoBackend
        $this.CreateBackup = $Global:DeployConfig.CriarBackup
        
        # Configurar exclusões padrão
        $this.ExcludedFolders = @(
            "venv",
            "__pycache__",
            ".git",
            "node_modules",
            ".pytest_cache",
            ".coverage",
            "htmlcov",
            "instance",
            "logs"
        )
        
        $this.ExcludedFiles = @(
            "*.pyc",
            "*.pyo",
            "*.pyd",
            ".DS_Store",
            "Thumbs.db",
            "*.log",
            ".env.local",
            ".env.development",
            "*.swp",
            "*.tmp"
        )
    }
    
    [bool] ValidateLocalBackend() {
        Write-DeployDebug "A validar o backend local..." "BACKEND"
        
        if (-not (Test-Path $this.LocalPath)) {
            Write-DeployError "Diretório do backend não encontrado: $($this.LocalPath)" "BACKEND"
            return $false
        }
        
        # Verificar arquivos essenciais
        $essentialFiles = @("app.py", "main.py", "requirements.txt", "run.py")
        $foundEssential = $false
        
        foreach ($file in $essentialFiles) {
            $filePath = Join-Path $this.LocalPath $file
            if (Test-Path $filePath) {
                Write-DeployDebug "Ficheiro essencial encontrado: $file" "BACKEND"
                $foundEssential = $true
                break
            }
        }
        
        if (-not $foundEssential) {
            Write-DeployWarning "Nenhum arquivo essencial encontrado ($(($essentialFiles -join ', ')))" "BACKEND"
        }
        
        # Contar arquivos Python
        $pythonFiles = Get-ChildItem $this.LocalPath -Filter "*.py" -Recurse | Where-Object {
            $this.ShouldIncludeFile($_.FullName)
        }
        
        Write-DeployInfo "Backend validado: $($pythonFiles.Count) ficheiros Python encontrados" "BACKEND"

        if ($pythonFiles.Count -eq 0) {
            Write-DeployWarning "Nenhum ficheiro Python encontrado no backend!" "BACKEND"
        }
        
        return $true
    }
    
    [bool] ShouldIncludeFile([string]$filePath) {
        $relativePath = $filePath.Substring($this.LocalPath.Length).TrimStart('\', '/')
        
        # Verificar pastas excluídas
        foreach ($excludedFolder in $this.ExcludedFolders) {
            if ($relativePath -like "*$excludedFolder*") {
                return $false
            }
        }
        
        # Verificar arquivos excluídos
        $fileName = Split-Path $relativePath -Leaf
        foreach ($excludedPattern in $this.ExcludedFiles) {
            if ($fileName -like $excludedPattern) {
                return $false
            }
        }
        
        return $true
    }
    
    [bool] CreateRemoteBackup() {
        if (-not $this.CreateBackup) {
            Write-DeployDebug "Cópia de segurança desativada na configuração" "BACKEND"
            return $true
        }
        
        if (-not (Test-Path $this.RemotePath)) {
            Write-DeployDebug "Caminho remoto não existe, backup desnecessário" "BACKEND"
            return $true
        }
        
        try {
            $backupPath = Get-BackupPath $this.RemotePath
            Write-DeployInfo "A criar cópia de segurança do backend: $backupPath" "BACKEND"

            Move-Item $this.RemotePath $backupPath -ErrorAction Stop
            Write-DeployInfo "Cópia de segurança criada com sucesso!" "BACKEND"
            
            # Limpar backups antigos
            $this.CleanOldBackups()
            
            return $true
        }
        catch {
            Write-DeployException $_.Exception "Criação de backup do backend" "BACKEND"
            return $false
        }
    }
    
    [void] CleanOldBackups() {
        try {
            $backupPattern = "$($this.RemotePath)-backup-*"
            $remoteDir = Split-Path $this.RemotePath -Parent
            
            if (-not (Test-Path $remoteDir)) {
                return
            }
            
            $backups = Get-ChildItem $remoteDir | Where-Object { 
                $_.Name -like (Split-Path $backupPattern -Leaf) 
            } | Sort-Object LastWriteTime -Descending
            
            if ($backups.Count -gt $Global:DeployConfig.ManterBackups) {
                $backupsToRemove = $backups | Select-Object -Skip $Global:DeployConfig.ManterBackups
                
                foreach ($backup in $backupsToRemove) {
                    Write-DeployDebug "A remover cópia de segurança antiga do backend: $($backup.Name)" "BACKEND"
                    Remove-Item $backup.FullName -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
        catch {
            Write-DeployWarning "Erro ao limpar backups antigos do backend: $($_.Exception.Message)" "BACKEND"
        }
    }
    
    [bool] DeployFiles() {
        Write-DeployInfo "A iniciar o deployment do backend (robocopy)..." "BACKEND"

        try {
            # Converter caminho ServerDrive para UNC
            $remoteBasePath = $this.RemotePath -replace "^ServerDrive:", "\\172.16.2.35\app"

            $copyStartTime = Get-Date

            # Construir argumentos do robocopy
            $robocopyArgs = @(
                $this.LocalPath,
                $remoteBasePath,
                "/E",       # Subdirectórios incluindo vazios
                "/PURGE",   # Remove no destino o que não existe na origem
                "/MT:8",    # 8 threads paralelas
                "/R:2",     # 2 tentativas em erro
                "/W:3",     # 3 segundos entre tentativas
                "/NFL",     # Sem lista de ficheiros no output
                "/NDL",     # Sem lista de directórios no output
                "/NJH",     # Sem cabeçalho
                "/NJS"      # Sem sumário
            )

            # Adicionar exclusões de pastas
            if ($this.ExcludedFolders.Count -gt 0) {
                $robocopyArgs += "/XD"
                $robocopyArgs += $this.ExcludedFolders
            }

            # Adicionar exclusões de ficheiros
            if ($this.ExcludedFiles.Count -gt 0) {
                $robocopyArgs += "/XF"
                $robocopyArgs += $this.ExcludedFiles
            }

            Write-DeployDebug "robocopy: $($this.LocalPath) -> $remoteBasePath" "BACKEND"
            & robocopy @robocopyArgs | Out-Null

            # robocopy: códigos 0-7 são sucesso; 8+ são erros
            if ($LASTEXITCODE -ge 8) {
                Write-DeployError "robocopy falhou com código $LASTEXITCODE" "BACKEND"
                return $false
            }

            $copyDuration = (Get-Date) - $copyStartTime
            Write-DeployInfo "Backend copiado em $([Math]::Round($copyDuration.TotalSeconds, 1))s (código robocopy: $LASTEXITCODE)" "BACKEND"

            return $this.ValidateRemoteDeployment()
        }
        catch {
            Write-DeployException $_.Exception "Deployment de ficheiros do backend" "BACKEND"
            return $false
        }
    }
    
    [bool] ValidateRemoteDeployment() {
        Write-DeployDebug "A validar o deployment remoto do backend..." "BACKEND"
        
        # Converter path para UNC
        $remoteBasePath = $this.RemotePath -replace "^ServerDrive:", "\\172.16.2.35\app"
        
        if (-not (Test-Path $remoteBasePath)) {
            Write-DeployError "Caminho remoto do backend não existe após deployment: $remoteBasePath" "BACKEND"
            return $false
        }
        
        # Contar ficheiros Python remotos
        $remotePythonFiles = Get-ChildItem $remoteBasePath -Filter "*.py" -Recurse -ErrorAction SilentlyContinue
        $localPythonFiles = Get-ChildItem $this.LocalPath -Filter "*.py" -Recurse | Where-Object {
            $this.ShouldIncludeFile($_.FullName)
        }
        
        Write-DeployDebug "Ficheiros Python - Local: $($localPythonFiles.Count), Remoto: $($remotePythonFiles.Count)" "BACKEND"
        
        if ($remotePythonFiles.Count -eq 0) {
            Write-DeployError "Nenhum ficheiro Python encontrado no deployment remoto" "BACKEND"
            return $false
        }
        
        # Verificar ficheiros essenciais
        $essentialFiles = @("app.py", "main.py", "run.py")
        $foundEssential = $false
        
        foreach ($file in $essentialFiles) {
            $remoteFilePath = "$($remoteBasePath.TrimEnd('\'))\$file"
            if (Test-Path $remoteFilePath) {
                Write-DeployDebug "Ficheiro essencial encontrado no remoto: $file" "BACKEND"
                $foundEssential = $true
                break
            }
        }
        
        if (-not $foundEssential) {
            Write-DeployWarning "Nenhum ficheiro essencial encontrado no deployment remoto" "BACKEND"
        }
        
        Write-DeployInfo "Deployment remoto do backend validado!" "BACKEND"
        return $true
    }
    
    [bool] Deploy() {
        Write-DeployInfo "A iniciar o deployment do backend..." "BACKEND"
        
        # Validar backend local
        if (-not $this.ValidateLocalBackend()) {
            Write-DeployError "Backend local inválido, deployment cancelado" "BACKEND"
            return $false
        }
        
        # Criar backup do deployment atual
        if (-not $this.CreateRemoteBackup()) {
            Write-DeployWarning "Falha ao criar backup, continuando..." "BACKEND"
        }
        
        # Deploy arquivos
        if (-not $this.DeployFiles()) {
            Write-DeployError "Falha no deployment do backend" "BACKEND"
            return $false
        }
        
        Write-DeployInfo "Deployment do backend concluído com sucesso!" "BACKEND"
        return $true
    }
    
    [object] GetDeploymentInfo() {
        $info = @{
            LocalPath = $this.LocalPath
            RemotePath = $this.RemotePath
            LocalExists = Test-Path $this.LocalPath
            RemoteExists = $false
            LocalFileCount = 0
            RemoteFileCount = 0
            LocalPythonFiles = 0
            RemotePythonFiles = 0
            ExcludedFolders = $this.ExcludedFolders
            ExcludedFiles = $this.ExcludedFiles
        }
        
        # Informações locais
        if ($info.LocalExists) {
            $localFiles = Get-ChildItem $this.LocalPath -Recurse -File | Where-Object {
                $this.ShouldIncludeFile($_.FullName)
            }
            $info.LocalFileCount = $localFiles.Count
            $info.LocalPythonFiles = ($localFiles | Where-Object { $_.Extension -eq ".py" }).Count
        }
        
        # Informações remotas (só se conectado)
        if (Test-DeployConnection) {
            $info.RemoteExists = Test-Path $this.RemotePath
            
            if ($info.RemoteExists) {
                $remoteFiles = Get-ChildItem $this.RemotePath -Recurse -File -ErrorAction SilentlyContinue
                $info.RemoteFileCount = $remoteFiles.Count
                $info.RemotePythonFiles = ($remoteFiles | Where-Object { $_.Extension -eq ".py" }).Count
            }
        }
        
        return $info
    }
}

# ============================================================================
# FUNÇÕES PÚBLICAS DO MÓDULO
# ============================================================================

function Deploy-Backend {
    Write-Host "DEBUG: CaminhoLocalBackend: $($Global:DeployConfig.CaminhoLocalBackend)"
    Write-Host "DEBUG: CaminhoRemotoBackend: $($Global:DeployConfig.CaminhoRemotoBackend)"
    $deployer = [BackendDeployer]::new()
    
    return Invoke-WithServerConnection -ScriptBlock {
        return $deployer.Deploy()
    } -OperationName "Deploy Backend"
}

function Test-BackendLocal {
    $deployer = [BackendDeployer]::new()
    return $deployer.ValidateLocalBackend()
}

function Get-BackendDeploymentInfo {
    $deployer = [BackendDeployer]::new()
    return $deployer.GetDeploymentInfo()
}

function Get-BackendExclusions {
    $deployer = [BackendDeployer]::new()
    return @{
        ExcludedFolders = $deployer.ExcludedFolders
        ExcludedFiles = $deployer.ExcludedFiles
    }
}

function Set-BackendExclusions {
    param(
        [string[]]$ExcludedFolders,
        [string[]]$ExcludedFiles
    )
    
    Write-DeployWarning "As exclusões só afetarão deployments futuros na sessão atual" "BACKEND"
    
    if ($ExcludedFolders) {
        Write-DeployInfo "Pastas excluídas: $($ExcludedFolders -join ', ')" "BACKEND"
    }
    
    if ($ExcludedFiles) {
        Write-DeployInfo "Arquivos excluídos: $($ExcludedFiles -join ', ')" "BACKEND"
    }
}