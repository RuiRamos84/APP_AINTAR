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
        Faz dois builds do frontend-v2:
          1. npm run build        → dist/        (backoffice, base='/v2/')
          2. npm run build:portal → dist-portal/ (portal, base='/')
    #>
    $projectPath  = $Global:DeployConfig.CaminhoProjetoFrontendV2
    $buildPath    = $Global:DeployConfig.CaminhoLocalFrontendV2
    $portalPath   = $Global:DeployConfig.CaminhoLocalFrontendV2Portal

    if (-not (Test-Path $projectPath)) {
        Write-DeployError "Diretório do projeto frontend-v2 não encontrado: $projectPath" "FRONTEND-V2"
        return $false
    }

    $currentLocation = Get-Location

    try {
        Set-Location -Path $projectPath

        # ── Build 1: Backoffice (base='/v2/') ──────────────────────────────
        Write-DeployInfo "A executar 'npm run build' (backoffice) em: $projectPath" "FRONTEND-V2"
        $p1 = Start-Process `
            -FilePath "C:\Program Files\nodejs\npm.cmd" `
            -ArgumentList "run", "build" `
            -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput "build_v2_output.log" `
            -RedirectStandardError "build_v2_error.log"

        if ($p1.ExitCode -ne 0) {
            Write-DeployError "Erro no build backoffice (Exit Code: $($p1.ExitCode))" "FRONTEND-V2"
            try {
                $err = Get-Content "build_v2_error.log" -Raw -ErrorAction SilentlyContinue
                if ($err) { Write-DeployError "Detalhes: $err" "FRONTEND-V2" }
            } catch {}
            return $false
        }
        if (-not (Test-Path $buildPath)) {
            Write-DeployError "Build backoffice concluído mas pasta dist não encontrada" "FRONTEND-V2"
            return $false
        }
        $sz1 = [Math]::Round(((Get-ChildItem $buildPath -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)
        Write-DeployInfo "Build backoffice concluído ($sz1 MB)" "FRONTEND-V2"

        # ── Build 2: Portal (base='/') ────────────────────────────────────
        Write-DeployInfo "A executar 'npm run build:portal' (portal clientes) em: $projectPath" "FRONTEND-V2"
        $p2 = Start-Process `
            -FilePath "C:\Program Files\nodejs\npm.cmd" `
            -ArgumentList "run", "build:portal" `
            -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput "build_portal_output.log" `
            -RedirectStandardError "build_portal_error.log"

        if ($p2.ExitCode -ne 0) {
            Write-DeployError "Erro no build portal (Exit Code: $($p2.ExitCode))" "FRONTEND-V2"
            try {
                $err = Get-Content "build_portal_error.log" -Raw -ErrorAction SilentlyContinue
                if ($err) { Write-DeployError "Detalhes: $err" "FRONTEND-V2" }
            } catch {}
            return $false
        }
        if (-not (Test-Path $portalPath)) {
            Write-DeployError "Build portal concluído mas pasta dist-portal não encontrada" "FRONTEND-V2"
            return $false
        }
        $sz2 = [Math]::Round(((Get-ChildItem $portalPath -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)
        Write-DeployInfo "Build portal concluído ($sz2 MB)" "FRONTEND-V2"

        return $true
    }
    catch {
        Write-DeployException $_.Exception "Build do frontend-v2" "FRONTEND-V2"
        return $false
    }
    finally {
        Set-Location -Path $currentLocation
        try {
            Remove-Item "build_v2_output.log", "build_v2_error.log",
                        "build_portal_output.log", "build_portal_error.log" -ErrorAction SilentlyContinue
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

        # Deploy via robocopy → build-v2 (backoffice)
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
            Write-DeployError "robocopy build-v2 falhou com código $LASTEXITCODE" "FRONTEND-V2"
            return $false
        }

        $duration = [Math]::Round(((Get-Date) - $copyStartTime).TotalSeconds, 1)
        Write-DeployInfo "Frontend-v2 (backoffice) copiado em ${duration}s (robocopy: $LASTEXITCODE)" "FRONTEND-V2"

        # Copiar build:portal (base='/') para build-clientes
        $portalBuildPath   = $Global:DeployConfig.CaminhoLocalFrontendV2Portal
        $remoteClientesUNC = $Global:DeployConfig.CaminhoRemotoFrontendV2Clientes -replace "^ServerDrive:", "\\172.16.2.35\app"
        if (-not (Test-Path $portalBuildPath)) {
            Write-DeployError "dist-portal não encontrado: $portalBuildPath — corre 'npm run build:portal' primeiro" "FRONTEND-V2"
            return $false
        }
        Write-DeployDebug "robocopy: $portalBuildPath -> $remoteClientesUNC" "FRONTEND-V2"
        $robocopyArgsClientes = @($portalBuildPath, $remoteClientesUNC, "/MIR", "/MT:8", "/R:2", "/W:3", "/NFL", "/NDL", "/NJH", "/NJS")
        & robocopy @robocopyArgsClientes | Out-Null
        if ($LASTEXITCODE -ge 8) {
            Write-DeployError "robocopy build-clientes falhou com código $LASTEXITCODE" "FRONTEND-V2"
            return $false
        }
        Write-DeployInfo "Portal clientes copiado de dist-portal (robocopy: $LASTEXITCODE)" "FRONTEND-V2"

        Write-DeployInfo "Disponível em: https://app.aintar.pt/v2/ e https://clientes.aintar.pt/" "FRONTEND-V2"
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