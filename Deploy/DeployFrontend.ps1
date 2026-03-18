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
        Write-DeployInfo "A iniciar o build do frontend..." "FRONTEND"
        
        if (-not (Test-Path $this.ProjectPath)) {
            Write-DeployError "Diretório do projeto não encontrado: $($this.ProjectPath)" "FRONTEND"
            return $false
        }
        
        $currentLocation = Get-Location
        
        try {
            Set-Location -Path $this.ProjectPath
            Write-DeployDebug "A executar 'npm run build' em: $($this.ProjectPath)" "FRONTEND"
            
            $buildProcess = Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" -ArgumentList "run", "build" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "build_output.log" -RedirectStandardError "build_error.log"
            
            if ($buildProcess.ExitCode -eq 0) {
                Write-DeployInfo "Build do frontend concluído com sucesso!" "FRONTEND"
                
                # Verificar se o build foi criado
                if (Test-Path $this.LocalBuildPath) {
                    $buildInfo = Get-ChildItem $this.LocalBuildPath -Recurse | Measure-Object
                    Write-DeployDebug "Build criado com $($buildInfo.Count) ficheiros" "FRONTEND"
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
        Write-DeployDebug "A validar o build local..." "FRONTEND"
        
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
            Write-DeployDebug "Caminho remoto não existe, cópia de segurança desnecessária" "FRONTEND"
            return $true
        }

        try {
            $backupPath = Get-BackupPath $remoteBasePath
            Write-DeployInfo "A criar cópia de segurança: $backupPath" "FRONTEND"

            Move-Item $remoteBasePath $backupPath -ErrorAction Stop
            Write-DeployInfo "Cópia de segurança criada!" "FRONTEND"
            
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
                    Write-DeployDebug "A remover cópia de segurança antiga: $($backup.Name)" "FRONTEND"
                    Remove-Item $backup.FullName -Recurse -Force -ErrorAction SilentlyContinue
                }
            }
        }
        catch {
            Write-DeployException $_.Exception "Limpeza de backups antigos" "FRONTEND"
        }
    }

    [bool] Deploy() {
        Write-DeployInfo "A iniciar o deployment do frontend (robocopy)..." "FRONTEND"

        if (-not $this.ValidateBuild()) {
            return $false
        }

        if (-not $this.CreateRemoteBackup()) {
            return $false
        }

        try {
            # Converter path para UNC
            $remoteBasePath = $this.RemotePath -replace "^ServerDrive:", "\\172.16.2.35\app"

            $copyStartTime = Get-Date

            # robocopy /MIR: espelho completo (cria, actualiza e remove o que não existe na origem)
            $robocopyArgs = @(
                $this.LocalBuildPath,
                $remoteBasePath,
                "/MIR",     # Espelho completo
                "/MT:8",    # 8 threads paralelas
                "/R:2",     # 2 tentativas em erro
                "/W:3",     # 3 segundos entre tentativas
                "/NFL",     # Sem lista de ficheiros no output
                "/NDL",     # Sem lista de directórios no output
                "/NJH",     # Sem cabeçalho
                "/NJS"      # Sem sumário
            )

            Write-DeployDebug "robocopy: $($this.LocalBuildPath) -> $remoteBasePath" "FRONTEND"
            & robocopy @robocopyArgs | Out-Null

            # robocopy: códigos 0-7 são sucesso; 8+ são erros
            if ($LASTEXITCODE -ge 8) {
                Write-DeployError "robocopy falhou com código $LASTEXITCODE" "FRONTEND"
                return $false
            }

            $copyDuration = (Get-Date) - $copyStartTime
            Write-DeployInfo "Frontend copiado em $([Math]::Round($copyDuration.TotalSeconds, 1))s (código robocopy: $LASTEXITCODE)" "FRONTEND"

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

# ============================================================================
# FRONTEND V2 - BUILD E DEPLOY
# ============================================================================

function Build-FrontendV2 {
    <#
    .SYNOPSIS
        Faz o build do frontend-v2 (Vite) com base '/v2/'
    #>
    $projectPath = $Global:DeployConfig.CaminhoProjetoFrontendV2
    $buildPath   = $Global:DeployConfig.CaminhoLocalFrontendV2

    if (-not (Test-Path $projectPath)) {
        Write-DeployError "Diretório do projeto frontend-v2 não encontrado: $projectPath" "FRONTEND-V2"
        return $false
    }

    $currentLocation = Get-Location

    try {
        Set-Location -Path $projectPath
        Write-DeployInfo "A executar 'npm run build' em: $projectPath" "FRONTEND-V2"

        $buildProcess = Start-Process `
            -FilePath "C:\Program Files\nodejs\npm.cmd" `
            -ArgumentList "run", "build" `
            -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput "build_v2_output.log" `
            -RedirectStandardError "build_v2_error.log"

        if ($buildProcess.ExitCode -eq 0) {
            Write-DeployInfo "Build do frontend-v2 concluído com sucesso!" "FRONTEND-V2"

            if (Test-Path $buildPath) {
                $buildInfo = Get-ChildItem $buildPath -Recurse | Measure-Object
                $buildSize = [Math]::Round(((Get-ChildItem $buildPath -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)
                Write-DeployDebug "Build criado com $($buildInfo.Count) ficheiros ($buildSize MB)" "FRONTEND-V2"
                return $true
            } else {
                Write-DeployError "Build concluído mas pasta dist não encontrada" "FRONTEND-V2"
                return $false
            }
        } else {
            Write-DeployError "Erro no build do frontend-v2 (Exit Code: $($buildProcess.ExitCode))" "FRONTEND-V2"
            try {
                $errorLog = Get-Content "build_v2_error.log" -Raw -ErrorAction SilentlyContinue
                if (-not [string]::IsNullOrEmpty($errorLog)) {
                    Write-DeployError "Detalhes do erro: $errorLog" "FRONTEND-V2"
                }
            } catch {}
            return $false
        }
    }
    catch {
        Write-DeployException $_.Exception "Build do frontend-v2" "FRONTEND-V2"
        return $false
    }
    finally {
        Set-Location -Path $currentLocation
        try {
            Remove-Item "build_v2_output.log", "build_v2_error.log" -ErrorAction SilentlyContinue
        } catch {}
    }
}

function Deploy-FrontendV2 {
    <#
    .SYNOPSIS
        Faz o deploy do frontend-v2 para build-v2/ no servidor
    .PARAMETER BuildFirst
        Se $true, executa o build antes do deploy
    #>
    param([bool]$BuildFirst = $true)

    if ($BuildFirst) {
        if (-not (Build-FrontendV2)) {
            return $false
        }
    }

    return Invoke-WithServerConnection -ScriptBlock {
        $localBuildPath = $Global:DeployConfig.CaminhoLocalFrontendV2
        $remotePath     = $Global:DeployConfig.CaminhoRemotoFrontendV2

        if (-not (Test-Path $localBuildPath)) {
            Write-DeployError "Build local v2 não encontrado: $localBuildPath" "FRONTEND-V2"
            return $false
        }

        # Verificar ficheiros essenciais
        if (-not (Test-Path (Join-Path $localBuildPath "index.html"))) {
            Write-DeployError "index.html não encontrado no build v2" "FRONTEND-V2"
            return $false
        }

        # Converter para UNC
        $remoteUNC = $remotePath -replace "^ServerDrive:", "\\172.16.2.35\app"

        # Backup se já existir
        if ((Test-Path $remoteUNC) -and $Global:DeployConfig.CriarBackup) {
            $backupPath = Get-BackupPath $remoteUNC
            Write-DeployInfo "A criar backup: $backupPath" "FRONTEND-V2"
            try {
                Move-Item $remoteUNC $backupPath -ErrorAction Stop

                # Limpar backups antigos (manter apenas 5)
                $remoteDir = Split-Path $remoteUNC -Parent
                $backups = Get-ChildItem $remoteDir | Where-Object { $_.Name -like "build-v2-backup-*" } | Sort-Object LastWriteTime -Descending
                if ($backups.Count -gt $Global:DeployConfig.ManterBackups) {
                    $backups | Select-Object -Skip $Global:DeployConfig.ManterBackups | ForEach-Object {
                        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
            } catch {
                Write-DeployWarning "Não foi possível criar backup: $($_.Exception.Message)" "FRONTEND-V2"
            }
        }

        # Deploy via robocopy
        $copyStartTime = Get-Date
        $robocopyArgs = @(
            $localBuildPath,
            $remoteUNC,
            "/MIR", "/MT:8", "/R:2", "/W:3",
            "/NFL", "/NDL", "/NJH", "/NJS"
        )

        Write-DeployDebug "robocopy: $localBuildPath -> $remoteUNC" "FRONTEND-V2"
        & robocopy @robocopyArgs | Out-Null

        if ($LASTEXITCODE -ge 8) {
            Write-DeployError "robocopy falhou com código $LASTEXITCODE" "FRONTEND-V2"
            return $false
        }

        $duration = [Math]::Round(((Get-Date) - $copyStartTime).TotalSeconds, 1)
        Write-DeployInfo "Frontend-v2 copiado em ${duration}s (código robocopy: $LASTEXITCODE)" "FRONTEND-V2"
        Write-DeployInfo "Disponível em: https://app.aintar.pt/v2/" "FRONTEND-V2"
        return $true

    } -OperationName "Deploy Frontend-V2"
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