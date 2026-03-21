# DeployVersion.ps1
# Gestao automatizada de versoes de deployment
# Versao: 1.1.0
#
# Modelo de versionamento:
#   - Cada componente tem a sua propria versao independente
#   - frontend (legacy) : linha 2.x.x
#   - frontend-v2       : linha 3.x.x  (versao global segue este)
#   - backend           : versao propria (segue o componente mais activo)
#   - bump patch  -> deploys de componente unico
#   - bump minor  -> deploys multi-componente
#   - bump major  -> flag manual -BumpMajor

# ============================================================================
# HELPER: acesso seguro a chaves com hifen (ex: frontend-v2)
# ============================================================================

function Get-CompData {
    param([pscustomobject]$Components, [string]$Name)
    return $Components.PSObject.Properties.Item($Name).Value
}

function Set-CompData {
    param([pscustomobject]$Components, [string]$Name, [string]$Property, $Value)
    $comp = $Components.PSObject.Properties.Item($Name).Value
    $comp.$Property = $Value
}

# ============================================================================
# LEITURA / ESCRITA
# ============================================================================

function Read-VersionData {
    $vFile = "C:\Users\rui.ramos\Desktop\APP\version.json"
    if (-not (Test-Path $vFile)) {
        Write-DeployWarning "version.json nao encontrado. A criar com versoes base..." "VERSION"
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
# LOGICA DE INCREMENTO
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
    param([string]$Operation, [bool]$ForceMajor = $false, [bool]$ForceMinor = $false)
    if ($ForceMajor) { return "major" }
    if ($ForceMinor) { return "minor" }
    return "patch"
}

function Get-ComponentsForOperation {
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
# INJECAO DE VERSAO NOS PROJETOS
# ============================================================================

# UTF-8 sem BOM — necessario para Vite e Python lerem corretamente
$Script:Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Set-FrontendLegacyVersion {
    param([string]$Version, [int]$Build)
    $envPath = Join-Path $Global:DeployConfig.CaminhoProjetoFrontend ".env.production.local"
    $content = "REACT_APP_VERSION=$Version`r`nREACT_APP_BUILD=$Build`r`n"
    [System.IO.File]::WriteAllText($envPath, $content, $Script:Utf8NoBom)
    Write-DeployDebug "Versao injectada no frontend legacy: v$Version (build #$Build)" "VERSION"
}

function Set-FrontendV2Version {
    param([string]$Version, [int]$Build)
    $envPath = Join-Path $Global:DeployConfig.CaminhoProjetoFrontendV2 ".env.production.local"
    $content = "VITE_APP_VERSION=$Version`r`nVITE_APP_BUILD=$Build`r`n"
    [System.IO.File]::WriteAllText($envPath, $content, $Script:Utf8NoBom)
    Write-DeployDebug "Versao injectada no frontend-v2: v$Version (build #$Build)" "VERSION"
}

function Set-BackendVersion {
    param([string]$Version, [int]$Build)
    $pyPath = Join-Path $Global:DeployConfig.CaminhoLocalBackend "app\__version__.py"
    $deployDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    $content = "# Auto-gerado pelo sistema de deploy -- nao editar manualmente`r`n__version__ = `"$Version`"`r`n__build__ = $Build`r`n__deploy_date__ = `"$deployDate`"`r`n"
    [System.IO.File]::WriteAllText($pyPath, $content, $Script:Utf8NoBom)
    Write-DeployDebug "Versao injectada no backend: v$Version (build #$Build)" "VERSION"
}

# ============================================================================
# FUNCAO PRINCIPAL -- cada componente bumpa a sua propria versao
# ============================================================================

function Invoke-VersionBump {
    param(
        [string]$Operation,
        [bool]$ForceMajor = $false,
        [bool]$ForceMinor = $false
    )

    $data       = Read-VersionData
    $bumpType   = Get-BumpTypeForOperation -Operation $Operation -ForceMajor $ForceMajor -ForceMinor $ForceMinor
    $components = Get-ComponentsForOperation -Operation $Operation

    if ($components.Count -eq 0) {
        Write-DeployDebug "Operacao '$Operation' sem componentes versionados -- sem bump." "VERSION"
        return $null
    }

    $newBuild = [int]$data.buildNumber + 1
    $now      = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

    # Cada componente bumpa a sua propria versao independentemente
    $bumpLog = @()
    foreach ($comp in $components) {
        $compObj = $data.components.PSObject.Properties.Item($comp).Value
        $oldV = $compObj.version
        $newV = Step-VersionNumber -Current $oldV -Bump $bumpType
        $compObj.version    = $newV
        $compObj.lastDeploy = $now
        $bumpLog += "  $($comp.PadRight(14)) v$oldV -> v$newV"
    }

    # Versao global acompanha o frontend-v2 (produto principal)
    if ($components -contains "frontend-v2") {
        $v2Obj = $data.components.PSObject.Properties.Item("frontend-v2").Value
        $data.version = $v2Obj.version
    }

    $data.buildNumber = $newBuild

    # Historico
    $versionsSnapshot = [pscustomobject]@{}
    foreach ($comp in $components) {
        $compObj = $data.components.PSObject.Properties.Item($comp).Value
        $versionsSnapshot | Add-Member -NotePropertyName $comp -NotePropertyValue $compObj.version
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

    Write-DeployInfo "===========================================" "VERSION"
    Write-DeployInfo "  Build #$newBuild  [$bumpType]  Operacao: $Operation" "VERSION"
    foreach ($line in $bumpLog) { Write-DeployInfo $line "VERSION" }
    Write-DeployInfo "===========================================" "VERSION"

    # Injectar versao propria de cada componente
    if ($components -contains "frontend") {
        $feObj = $data.components.PSObject.Properties.Item("frontend").Value
        Set-FrontendLegacyVersion -Version $feObj.version -Build $newBuild
    }
    if ($components -contains "frontend-v2") {
        $v2Obj = $data.components.PSObject.Properties.Item("frontend-v2").Value
        Set-FrontendV2Version -Version $v2Obj.version -Build $newBuild
    }
    if ($components -contains "backend") {
        $beObj = $data.components.PSObject.Properties.Item("backend").Value
        Set-BackendVersion -Version $beObj.version -Build $newBuild
    }

    return [pscustomobject]@{
        BuildNumber = $newBuild
        BumpType    = $bumpType
        Components  = $components
        Versions    = $versionsSnapshot
    }
}

# ============================================================================
# CONSULTA / HISTORICO
# ============================================================================

function Show-VersionStatus {
    $data = Read-VersionData

    $compFe = $data.components.PSObject.Properties.Item("frontend").Value
    $compV2 = $data.components.PSObject.Properties.Item("frontend-v2").Value
    $compBe = $data.components.PSObject.Properties.Item("backend").Value

    $feV  = $compFe.version
    $feDt = if ($null -eq $compFe.lastDeploy) { "nunca" } else { $compFe.lastDeploy }
    $v2V  = $compV2.version
    $v2Dt = if ($null -eq $compV2.lastDeploy) { "nunca" } else { $compV2.lastDeploy }
    $beV  = $compBe.version
    $beDt = if ($null -eq $compBe.lastDeploy) { "nunca" } else { $compBe.lastDeploy }

    Write-DeployInfo "=== ESTADO DE VERSOES ===" "VERSION"
    Write-DeployInfo "  Build global  : #$($data.buildNumber)" "VERSION"
    Write-Host ""
    Write-DeployInfo "  frontend (legacy) : v$feV    ultimo deploy: $feDt" "VERSION"
    Write-DeployInfo "  frontend-v2       : v$v2V    ultimo deploy: $v2Dt" "VERSION"
    Write-DeployInfo "  backend           : v$beV    ultimo deploy: $beDt" "VERSION"
    Write-Host ""

    $histCount = @($data.history).Count
    if ($histCount -gt 0) {
        $last = [Math]::Min($histCount, 10)
        Write-DeployInfo "  Ultimos $last deploys:" "VERSION"
        @($data.history) | Select-Object -Last 10 | ForEach-Object {
            $entry  = $_
            $verStr = ($entry.versions.PSObject.Properties | ForEach-Object { "$($_.Name):v$($_.Value)" }) -join "  "
            Write-DeployInfo "    [$($entry.date)]  b#$($entry.build)  $($entry.operation)  [$($entry.bumpType)]  $verStr" "VERSION"
        }
    } else {
        Write-DeployInfo "  Sem historico de deploys ainda." "VERSION"
    }
}
