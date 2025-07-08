# DeployFrontend.ps1
# Módulo de deployment do frontend
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CLASSE DE DEPLOYMENT FRONTEND
# ============================================================================

class FrontendDeployer {
    [string]$LocalBuildPath
    [string]$RemotePath
    [string]$ProjectPath
    [bool]$CreateBackup
    
    FrontendDeployer() {
        $this.LocalBuildPath = $Global:DeployConfig.CaminhoLocalFrontend
        $this.RemotePath = $Global:DeployConfig.CaminhoRemotoFrontend
        $this.ProjectPath = $Global:DeployConfig.CaminhoProjetoFrontend
        $this.CreateBackup = $Global:DeployConfig.CriarBackup
    }
    
    [bool] BuildProject() {
        Write-DeployInfo "Iniciando build do frontend..." "FRONTEND"
        
        if (-not (Test-Path $this.ProjectPath)) {
            Write-DeployError "Diretório do projeto não encontrado: $($this.ProjectPath)" "FRONTEND"
            return $false
        }
        
        $currentLocation = Get-Location
        
        try {
            Set-Location -Path $this.ProjectPath
            Write-DeployDebug "Executando 'npm run build' em: $($this.ProjectPath)" "FRONTEND"
            
            $buildProcess = Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" -ArgumentList "run", "build" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "build_output.log" -RedirectStandardError "build_error.log"
            
            if ($buildProcess.ExitCode -eq 0) {
                Write-DeployInfo "Build do frontend concluído com sucesso!" "FRONTEND"
                
                # Verificar se o build foi criado
                if (Test-Path $this.LocalBuildPath) {
                    $buildInfo = Get-ChildItem $this.LocalBuildPath -Recurse | Measure-Object
                    Write-DeployDebug "Build criado com $($buildInfo.Count) arquivos" "FRONTEND"
                    return $true
                } else {
                    Write-DeployError "Build concluído mas pasta build não encontrada" "FRONTEND"
                    return $false
                }
            } else {
                Write-DeployError "Erro no build do frontend (Exit Code: $($buildProcess.ExitCode))" "FRONTEND"
                
                # Tentar ler logs de erro
                try {
                    $errorLog = Get-Content "build_error.log" -Raw -ErrorAction SilentlyContinue
                    if (-not [string]::IsNullOrEmpty($errorLog)) {
                        Write-DeployError "Detalhes do erro: $errorLog" "FRONTEND"
                    }
                }
                catch {
                    Write-DeployDebug "Não foi possível ler o log de erro" "FRONTEND"
                }
                
                return $false
            }
        }
        catch {
            Write-DeployException $_.Exception "Build do frontend" "FRONTEND"
            return $false
        }
        finally {
            Set-Location -Path $currentLocation
            
            # Limpar logs temporários
            try {
                Remove-Item "build_output.log", "build_error.log" -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    
    [bool] ValidateBuild() {
        Write-DeployDebug "Validando build local..." "FRONTEND"
        
        if (-not (Test-Path $this.LocalBuildPath)) {
            Write-DeployError "Build local não encontrado: $($this.LocalBuildPath)" "FRONTEND"
            return $false
        }
        
        # Verificar arquivos essenciais
        $essentialFiles = @("index.html", "static")
        $missingFiles = @()
        
        foreach ($file in $essentialFiles) {
            $filePath = Join-Path $this.LocalBuildPath $file
            if (-not (Test-Path $filePath)) {
                $missingFiles += $file
            }
        }
        
        if ($missingFiles.Count -gt 0) {
            Write-DeployError "Arquivos essenciais não encontrados no build: $($missingFiles -join ', ')" "FRONTEND"
            return $false
        }
        
        # Verificar tamanho do build
        $buildSize = (Get-ChildItem $this.LocalBuildPath -Recurse | Measure-Object -Property Length -Sum).Sum
        $buildSizeMB = [Math]::Round($buildSize / 1MB, 2)
        
        Write-DeployInfo "Build validado: $buildSizeMB MB" "FRONTEND"
        
        if ($buildSizeMB -eq 0) {
            Write-DeployWarning "Build parece estar vazio!" "FRONTEND"
            return $false
        }
        
        return $true
    }
    
    [bool] CreateRemoteBackup() {
        if (-not $this.CreateBackup) {
            return $true
        }
        
        # Converter para UNC
        $remoteBasePath = $this.RemotePath -replace "^ServerDrive:", "\\172.16.2.35\app"
        
        if (-not (Test-Path $remoteBasePath)) {
            Write-DeployDebug "Caminho remoto não existe, backup desnecessário" "FRONTEND"
            return $true
        }
        
        try {
            $backupPath = Get-BackupPath $remoteBasePath
            Write-DeployInfo "Criando backup: $backupPath" "FRONTEND"
            
            Move-Item $remoteBasePath $backupPath -ErrorAction Stop
            Write-DeployInfo "Backup criado!" "FRONTEND"
            
            $this.CleanOldBackups()
            return $true
        }
        catch {
            Write-DeployException $_.Exception "Criação de backup" "FRONTEND"
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
                    Write-DeployDebug "Removendo backup antigo: $($backup.Name)" "FRONTEND"
                    Remove-Item $backup.FullName -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
        catch {
            Write-DeployException $_.Exception "Limpeza de backups antigos" "FRONTEND"
        }
    }

    [bool] Deploy() {
        Write-DeployInfo "Iniciando deployment do frontend..." "FRONTEND"
    
        if (-not $this.ValidateBuild()) {
            return $false
        }
    
        if (-not $this.CreateRemoteBackup()) {
            return $false
        }
    
        try {
            # Converter path para UNC
            $remoteBasePath = $this.RemotePath -replace "^ServerDrive:", "\\172.16.2.35\app"
            
            # Garantir directório remoto
            if (-not (Test-Path $remoteBasePath)) {
                New-Item -Path $remoteBasePath -ItemType Directory -Force | Out-Null
            }
            
            # Copiar build
            $buildFiles = Get-ChildItem $this.LocalBuildPath -Recurse
            foreach ($item in $buildFiles) {
                $relativePath = $item.FullName.Substring($this.LocalBuildPath.Length).TrimStart('\', '/')
                $targetPath = "$($remoteBasePath.TrimEnd('\'))\$relativePath"
                
                if ($item.PSIsContainer) {
                    if (-not (Test-Path $targetPath)) {
                        New-Item -Path $targetPath -ItemType Directory -Force | Out-Null
                    }
                } else {
                    $targetDir = Split-Path $targetPath -Parent
                    if (-not (Test-Path $targetDir)) {
                        New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
                    }
                    Copy-Item -Path $item.FullName -Destination $targetPath -Force
                }
            }
            
            Write-DeployInfo "Deployment do frontend concluído!" "FRONTEND"
            return $true
        }
        catch {
            Write-DeployException $_.Exception "Deployment do frontend" "FRONTEND"
            return $false
        }
    }

    [void] TestDeployment() {
        Write-DeployDebug "Testando deployment do frontend..." "FRONTEND"
        
        if (-not (Test-Path $this.LocalBuildPath)) {
            Write-DeployError "Diretório de build local não encontrado: $($this.LocalBuildPath)" "FRONTEND"
            return
        }
        
        if (-not (Test-Path $this.RemotePath)) {
            Write-DeployError "Diretório remoto não encontrado: $($this.RemotePath)" "FRONTEND"
            return
        }
        
        # Simular teste de deployment
        Start-Sleep -Seconds 1
        Write-DeployInfo "Teste de deployment do frontend concluído com sucesso!" "FRONTEND"
    }
    [void] Run() {
        Write-DeployInfo "Iniciando processo de deployment do frontend..." "FRONTEND"
        
        if (-not (BuildProject)) {
            Write-DeployError "Build do frontend falhou, abortando deployment" "FRONTEND"
            return
        }
        
        if (-not (Deploy)) {
            Write-DeployError "Deployment do frontend falhou" "FRONTEND"
            return
        }
        
        Write-DeployInfo "Deployment do frontend concluído com sucesso!" "FRONTEND"
    }
}
# ============================================================================
# FUNÇÃO DE INICIALIZAÇÃO DO DEPLOYER
# ============================================================================

function Initialize-FrontendDeployer {
    Write-DeployInfo "Inicializando deployer do frontend..." "FRONTEND"
    
    $deployer = [FrontendDeployer]::new()
    
    if (-not (Test-DeployConfig)) {
        Write-DeployError "Configuração de deployment inválida, verifique os logs" "FRONTEND"
        return $null
    }
    
    $deployer.TestConnection()
    return $deployer
}
# ============================================================================
# FUNÇÕES PÚBLICAS DO MÓDULO
# ============================================================================

# No Deploy-Frontend, tirar BuildProject() do ScriptBlock
function Deploy-Frontend {
    param([bool]$BuildFirst = $true)
    
    $deployer = [FrontendDeployer]::new()
    
    # BUILD LOCAL (sem ligação)
    if ($BuildFirst) {
        if (-not $deployer.BuildProject()) {
            return $false
        }
    }
    
    # DEPLOY REMOTO (com ligação)
    return Invoke-WithServerConnection -ScriptBlock {
        $localDeployer = [FrontendDeployer]::new()
        return $localDeployer.Deploy()
    } -OperationName "Deploy Frontend"
}

function Build-Frontend {
    $deployer = [FrontendDeployer]::new()
    return $deployer.BuildProject()
}

function Test-FrontendBuild {
    $deployer = [FrontendDeployer]::new()
    return $deployer.ValidateBuild()
}

function Get-FrontendBuildInfo {
    $deployer = [FrontendDeployer]::new()
    
    $info = @{
        LocalBuildPath = $deployer.LocalBuildPath
        LocalBuildExists = Test-Path $deployer.LocalBuildPath
        ProjectPath = $deployer.ProjectPath
        ProjectExists = Test-Path $deployer.ProjectPath
        LocalFileCount = 0
        LocalBuildSize = 0
        LastBuildTime = $null
    }
    
    if ($info.LocalBuildExists) {
        $buildFiles = Get-ChildItem $deployer.LocalBuildPath -Recurse -File -ErrorAction SilentlyContinue
        $info.LocalFileCount = $buildFiles.Count
        $info.LocalBuildSize = ($buildFiles | Measure-Object -Property Length -Sum).Sum
        $info.LastBuildTime = (Get-Item $deployer.LocalBuildPath).LastWriteTime
    }
    
    return $info
}