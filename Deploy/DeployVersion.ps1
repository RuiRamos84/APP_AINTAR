# DeployVersion.ps1
# Gestão automatizada de versões de deployment
# Versão: 1.1.0
#
# Modelo de versionamento:
#   - Cada componente tem a sua própria versão independente
#   - frontend (legacy) : linha 2.x.x
#   - frontend-v2       : linha 3.x.x  (versão global segue este)
#   - backend           : versão própria (segue o componente mais activo)
#   - bump patch  → deploys de componente único
#   - bump minor  → deploys multi-componente
#   - bump major  → flag manual -BumpMajor

# ============================================================================
# LEITURA / ESCRITA
# ============================================================================

function Read-VersionData {
    $vFile = "C:\Users\rui.ramos\Desktop\APP\version.json"
    if (-not (Test-Path $vFile)) {
        Write-DeployWarning "version.json não encontrado. A criar com versões base..." "VERSION"
        $initial = '{"version":"3.0.0","buildNumber":0,"components":{"frontend":{"version":"2.0.0","lastDeploy":null},"frontend-v2":{"version":"3.0.0","lastDeploy":null},"backend":{"version":"3.0.0","lastDeploy":null}},"history":[]}'
        Set-Content $vFile -Value $initial -Encoding UTF8
    }
    return (Get-Content $vFile -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Save-VersionData {
    param([pscustomobject]$Data)
    $vFile = "C:\Users\rui.ramos\Desktop\APP\version.json"
    $Data | ConvertTo-Json -Depth 10 | Set-Content $vFile -Encoding UTF8
}

# ============================================================================
# LÓGICA DE INCREMENTO
# ============================================================================

function Step-VersionNumber {
    param([string]$Current, [string]$Bump)
    $parts = $Current -split '\.'
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]
    switch ($Bump) {
        "major" { $major++; $minor = 0; $patch = 0 }
        "minor" { $minor++; $patch = 0 }
        "patch" { $patch++ }
    }
    return "$major.$minor.$patch"
}

function Get-BumpTypeForOperation {
    param([string]$Operation, [bool]$ForceMajor = $false)
    if ($ForceMajor) { return "major" }
    $minorOps = @("full", "frontend-backend", "backend-v2", "backend-v2-nobuild", "frontend-all", "frontend-all-nobuild")
    if ($minorOps -contains $Operation.ToLower()) { return "minor" }
    return "patch"
}

function Get-ComponentsForOperation {
    # Ambos os frontends são activos e recebem bumps independentes nas suas linhas de versão.
    param([string]$Operation)
    switch ($Operation.ToLower()) {
        "full"                 { return @("frontend", "backend", "frontend-v2") }
        "frontend"             { return @("frontend") }
        "frontend-nobuild"     { return @("frontend") }
        "backend"              { return @("backend") }
        "frontend-backend"     { return @("frontend", "backend") }
        "frontend-v2"          { return @("frontend-v2") }
        "frontend-v2-nobuild"  { return @("frontend-v2") }
        "backend-v2"           { return @("backend", "frontend-v2") }
        "backend-v2-nobuild"   { return @("backend", "frontend-v2") }
        "frontend-all"         { return @("frontend", "backend", "frontend-v2") }
        "frontend-all-nobuild" { return @("frontend", "backend", "frontend-v2") }
        default                { return @() }
    }
}

# ============================================================================
# INJEÇÃO DE VERSÃO NOS PROJETOS
# ============================================================================

function Set-FrontendLegacyVersion {
    param([string]$Version, [int]$Build)
    $envPath = Join-Path $Global:DeployConfig.CaminhoProjetoFrontend ".env.production.local"
    $content = "REACT_APP_VERSION=$Version`r`nREACT_APP_BUILD=$Build`r`n"
    Set-Content $envPath -Value $content -Encoding UTF8
    Write-DeployDebug "Versão injectada no frontend legacy: v$Version (build #$Build)" "VERSION"
}

function Set-FrontendV2Version {
    param([string]$Version, [int]$Build)
    $envPath = Join-Path $Global:DeployConfig.CaminhoProjetoFrontendV2 ".env.production.local"
    $content = "VITE_APP_VERSION=$Version`r`nVITE_APP_BUILD=$Build`r`n"
    Set-Content $envPath -Value $content -Encoding UTF8
    Write-DeployDebug "Versão injectada no frontend-v2: v$Version (build #$Build)" "VERSION"
}

function Set-BackendVersion {
    param([string]$Version, [int]$Build)
    $pyPath = Join-Path $Global:DeployConfig.CaminhoLocalBackend "app\__version__.py"
    $deployDate = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    $content = @"
# Auto-gerado pelo sistema de deploy — nao editar manualmente
__version__ = "$Version"
__build__ = $Build
__deploy_date__ = "$deployDate"
"@
    Set-Content $pyPath -Value $content -Encoding UTF8
    Write-DeployDebug "Versão injectada no backend: v$Version (build #$Build)" "VERSION"
}

# ============================================================================
# FUNÇÃO PRINCIPAL — cada componente bumpa a sua própria versão
# ============================================================================

function Invoke-VersionBump {
    param(
        [string]$Operation,
        [bool]$ForceMajor = $false
    )

    $data       = Read-VersionData
    $bumpType   = Get-BumpTypeForOperation -Operation $Operation -ForceMajor $ForceMajor
    $components = Get-ComponentsForOperation -Operation $Operation

    if ($components.Count -eq 0) {
        Write-DeployDebug "Operação '$Operation' sem componentes versionados — sem bump." "VERSION"
        return $null
    }

    $newBuild = [int]$data.buildNumber + 1
    $now      = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

    # Cada componente bumpa a sua própria versão independentemente
    $bumpLog = @()
    foreach ($comp in $components) {
        $oldV = $data.components.$comp.version
        $newV = Step-VersionNumber -Current $oldV -Bump $bumpType
        $data.components.$comp.version    = $newV
        $data.components.$comp.lastDeploy = $now
        $bumpLog += "  $($comp.PadRight(12)) v$oldV → v$newV"
    }

    # Versão global acompanha o frontend-v2 (produto principal)
    # Se só o legacy foi deployado, a versão global não muda
    if ($components -contains "frontend-v2") {
        $data.version = $data.components.'frontend-v2'.version
    }

    $data.buildNumber = $newBuild

    # Histórico
    $versionsSnapshot = [pscustomobject]@{}
    foreach ($comp in $components) {
        $versionsSnapshot | Add-Member -NotePropertyName $comp -NotePropertyValue $data.components.$comp.version
    }
    $newEntry = [pscustomobject]@{
        build     = $newBuild
        date      = $now
        operation = $Operation
        bumpType  = $bumpType
        by        = $env:USERNAME
        versions  = $versionsSnapshot
    }
    $history = @($data.history) + $newEntry
    if ($history.Count -gt 30) { $history = $history | Select-Object -Last 30 }
    $data.history = $history

    Save-VersionData -Data $data

    Write-DeployInfo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "VERSION"
    Write-DeployInfo "  Build #$newBuild  [$bumpType]  Operação: $Operation" "VERSION"
    foreach ($line in $bumpLog) { Write-DeployInfo $line "VERSION" }
    Write-DeployInfo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "VERSION"

    # Injectar versão própria de cada componente
    if ($components -contains "frontend")    { Set-FrontendLegacyVersion -Version $data.components.frontend.version    -Build $newBuild }
    if ($components -contains "frontend-v2") { Set-FrontendV2Version     -Version $data.components.'frontend-v2'.version -Build $newBuild }
    if ($components -contains "backend")     { Set-BackendVersion         -Version $data.components.backend.version     -Build $newBuild }

    return [pscustomobject]@{
        BuildNumber = $newBuild
        BumpType    = $bumpType
        Components  = $components
        Versions    = $versionsSnapshot
    }
}

# ============================================================================
# CONSULTA / HISTÓRICO
# ============================================================================

function Show-VersionStatus {
    $data = Read-VersionData

    Write-DeployInfo "=== ESTADO DE VERSÕES ===" "VERSION"
    Write-DeployInfo "  Build global  : #$($data.buildNumber)" "VERSION"
    Write-DeployInfo "" "VERSION"
    Write-DeployInfo "  frontend (legacy) : v$($data.components.frontend.version)    último deploy: $(if ($null -eq $data.components.frontend.lastDeploy) { 'nunca' } else { $data.components.frontend.lastDeploy })" "VERSION"
    Write-DeployInfo "  frontend-v2       : v$($data.components.'frontend-v2'.version)    último deploy: $(if ($null -eq $data.components.'frontend-v2'.lastDeploy) { 'nunca' } else { $data.components.'frontend-v2'.lastDeploy })" "VERSION"
    Write-DeployInfo "  backend           : v$($data.components.backend.version)    último deploy: $(if ($null -eq $data.components.backend.lastDeploy) { 'nunca' } else { $data.components.backend.lastDeploy })" "VERSION"
    Write-DeployInfo "" "VERSION"

    $histCount = @($data.history).Count
    if ($histCount -gt 0) {
        Write-DeployInfo "  Últimos $([Math]::Min($histCount, 10)) deploys:" "VERSION"
        @($data.history) | Select-Object -Last 10 | ForEach-Object {
            $verStr = ($_.versions.PSObject.Properties | ForEach-Object { "$($_.Name):v$($_.Value)" }) -join "  "
            Write-DeployInfo "    [$($_.date)]  b#$($_.build)  $($_.operation)  [$($_.bumpType)]  $verStr" "VERSION"
        }
    } else {
        Write-DeployInfo "  Sem histórico de deploys ainda." "VERSION"
    }
}
