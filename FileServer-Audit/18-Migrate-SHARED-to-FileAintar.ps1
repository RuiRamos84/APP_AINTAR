<#
.SYNOPSIS
    Move conteudo de D:\SHARED para D:\FILE_AINTAR, pasta a pasta.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.
    Usa robocopy /MOVE -- move ficheiros (copia + apaga origem) para libertar espaco.
    Cada pasta e movida sequencialmente. No final remove a partilha SMB e D:\SHARED.
    Usar -WhatIf para simular. Seguro de re-executar se interrompido (robocopy e idempotente).
.EXAMPLE
    .\18-Migrate-SHARED-to-FileAintar.ps1 -WhatIf
    .\18-Migrate-SHARED-to-FileAintar.ps1
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$SharedRoot     = 'D:\SHARED',
    [string]$FileAintarRoot = 'D:\FILE_AINTAR'
)

$ErrorActionPreference = 'Continue'

$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log    = Join-Path $ReportDir "Move-SHARED_$stamp.log"
$whatif = $PSCmdlet.MyInvocation.BoundParameters.ContainsKey('WhatIf')

function Log($msg, $color = 'White') {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue
}

function Normalize([string]$s) {
    $norm  = $s.Normalize([System.Text.NormalizationForm]::FormD)
    $chars = $norm.ToCharArray() | Where-Object {
        [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne `
        [System.Globalization.UnicodeCategory]::NonSpacingMark
    }
    return ([string]::new($chars)).ToUpperInvariant().Trim()
}

function Get-FolderLookup([string]$root) {
    $map = @{}
    Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $map[(Normalize $_.Name)] = $_.FullName
    }
    return $map
}

# ---------------------------------------------------------------
# Resolver caminhos reais via filesystem
# ---------------------------------------------------------------
$sh = Get-FolderLookup $SharedRoot
$fa = Get-FolderLookup $FileAintarRoot

$dagfDest     = $fa['DAGF']
$dpasDest     = $fa['DPAS']
$geralDest    = $fa['GERAL']
$arquivoDest  = $fa['ARQUIVO']
$tempDest     = $fa['TEMPORARIO']
$operacaoDest = $fa['OPERACAO']
$planDest     = $fa.Keys | Where-Object { $_ -like 'PLANEAMENTO*EMPREITADAS*' } |
                    Select-Object -First 1 | ForEach-Object { $fa[$_] }

$qualidadeDest = Join-Path $FileAintarRoot 'Qualidade'
$servicoDest   = if ($operacaoDest) { Join-Path $operacaoDest 'Servico' } else { $null }

$servicoSrc = Get-ChildItem -LiteralPath $SharedRoot -Directory -ErrorAction SilentlyContinue |
                  Where-Object { (Normalize $_.Name) -eq 'SERVICO' } |
                  Select-Object -First 1 -ExpandProperty FullName

$looseFile  = Get-ChildItem -LiteralPath $SharedRoot -File -ErrorAction SilentlyContinue |
                  Where-Object { (Normalize $_.Name) -like '*ETARS*' } |
                  Select-Object -First 1
$estudoDest = $fa.Keys | Where-Object { $_ -like 'ESTUDO*' } |
                  Select-Object -First 1 | ForEach-Object { $fa[$_] }

# Mapeamento: label -> @(src, dst)
$migrations = [ordered]@{
    'DGAF -> DAGF'                  = @($sh['DGAF'],               $dagfDest)
    'DPAS -> DPAS'                  = @($sh['DPAS'],               $dpasDest)
    'GERAL -> Geral'                = @($sh['GERAL'],              $geralDest)
    'Licenciamentos -> DPAS\Lic...' = @($sh['LICENCIAMENTOS'],     (Join-Path $dpasDest 'Licenciamentos'))
    'PLANEAMENTO -> Planeamento_*'  = @($sh['PLANEAMENTO'],        $planDest)
    'PROCESSOS DIGITAIS -> Arquivo' = @($sh['PROCESSOS DIGITAIS'], $arquivoDest)
    'QUALIDADE -> Qualidade'        = @($sh['QUALIDADE'],          $qualidadeDest)
    'SERVICO -> Operacao\Servico'   = @($servicoSrc,               $servicoDest)
    'TEMP -> Temporario'            = @($sh['TEMP'],               $tempDest)
}

Log "=== Mover SHARED -> FILE_AINTAR (/MOVE) -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO (-WhatIf)" 'Yellow' }

# ---------------------------------------------------------------
# Validar caminhos
# ---------------------------------------------------------------
Log ""
Log "[VALIDAR] Caminhos:" 'Yellow'
foreach ($label in $migrations.Keys) {
    $src = $migrations[$label][0]
    $dst = $migrations[$label][1]
    $srcOk = if ($src -and (Test-Path -LiteralPath $src)) { 'OK' } else { 'FALTA' }
    $dstOk = if ($dst) { 'OK' } else { 'FALTA' }
    $color = if ($srcOk -eq 'FALTA' -or $dstOk -eq 'FALTA') { 'Yellow' } else { 'Gray' }
    Log "  [$srcOk->$dstOk] $label" $color
    if ($srcOk -eq 'FALTA' -and $src) {
        Log "         src nao existe (pode ja ter sido movida): $src" 'DarkGray'
    }
}

# ---------------------------------------------------------------
# Criar pastas novas (Qualidade e Servico)
# ---------------------------------------------------------------
Log ""
Log "[PRE] Criar pastas novas se necessario..." 'Yellow'
foreach ($newDir in @($qualidadeDest, $servicoDest)) {
    if (-not $newDir) { continue }
    if (-not (Test-Path -LiteralPath $newDir)) {
        if ($whatif) {
            Log "    [WHATIF] Criaria: $newDir" 'DarkYellow'
        } else {
            New-Item -ItemType Directory -Path $newDir -Force | Out-Null
            Log "    [OK] Criada: $newDir" 'Green'
        }
    } else {
        Log "    [EXISTE] $newDir" 'Gray'
    }
}

# ACL Qualidade (grupos Ambiente)
if (-not $whatif -and (Test-Path -LiteralPath $qualidadeDest)) {
    try {
        $acl = Get-Acl -LiteralPath $qualidadeDest
        # So aplicar se ainda tiver heranca (nao foi configurada antes)
        if (-not $acl.AreAccessRulesProtected) {
            $acl.SetAccessRuleProtection($true, $false)
            $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }
            function New-ACE2([string]$id, [string]$rights) {
                New-Object System.Security.AccessControl.FileSystemAccessRule(
                    [System.Security.Principal.NTAccount]$id,
                    [System.Security.AccessControl.FileSystemRights]$rights,
                    [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',
                    [System.Security.AccessControl.PropagationFlags]'None',
                    [System.Security.AccessControl.AccessControlType]'Allow'
                )
            }
            $acl.AddAccessRule((New-ACE2 'NT AUTHORITY\SYSTEM'      'FullControl'))
            $acl.AddAccessRule((New-ACE2 'BUILTIN\Administrators'   'FullControl'))
            $acl.AddAccessRule((New-ACE2 'AINTAR\SG_FS_AMBIENTE_RW' 'Modify, Synchronize'))
            $acl.AddAccessRule((New-ACE2 'AINTAR\SG_FS_AMBIENTE_RO' 'ReadAndExecute, Synchronize'))
            Set-Acl -LiteralPath $qualidadeDest -AclObject $acl
            Log "    [OK] ACL Qualidade: AMBIENTE_RW + AMBIENTE_RO" 'Green'
        } else {
            Log "    [SKIP] ACL Qualidade ja configurada" 'Gray'
        }
    } catch {
        Log "    [AVISO] ACL Qualidade: $($_.Exception.Message)" 'Yellow'
    }
}

# ---------------------------------------------------------------
# MOVER pasta a pasta com robocopy /MOVE
# ---------------------------------------------------------------
Log ""
Log "[MOVER] A mover pastas (/MOVE -- ficheiros apagados da origem apos copia)..." 'Yellow'

$ok   = 0
$skip = 0
$errs = 0

foreach ($label in $migrations.Keys) {
    $src = $migrations[$label][0]
    $dst = $migrations[$label][1]

    if (-not $src) {
        Log "  [SKIP] Destino nao resolvido: $label" 'DarkYellow'
        $skip++
        continue
    }
    if (-not (Test-Path -LiteralPath $src)) {
        Log "  [SKIP] Origem ja movida ou nao existe: $label" 'Gray'
        $skip++
        continue
    }
    if (-not $dst) {
        Log "  [ERRO] Destino nao resolvido: $label" 'Red'
        $errs++
        continue
    }

    $safeLabel = $label -replace '[\\/:*?"<>|]', '_'
    $roboLog   = Join-Path $ReportDir "robomove_${safeLabel}_$stamp.log"

    Log ""
    Log "  $label" 'Cyan'

    if ($whatif) {
        & robocopy $src $dst /E /COPYALL /DCOPY:DAT /MOVE /R:3 /W:5 /NP /L /LOG+:$roboLog 2>&1 | Out-Null
    } else {
        & robocopy $src $dst /E /COPYALL /DCOPY:DAT /MOVE /R:3 /W:5 /NP /LOG+:$roboLog 2>&1 | Out-Null
    }

    $rc = $LASTEXITCODE
    if ($rc -le 3) {
        Log "    [OK] robocopy /MOVE exit=$rc" 'Green'
        # Apagar pasta de origem (fica vazia apos /MOVE)
        if (-not $whatif -and (Test-Path -LiteralPath $src)) {
            try {
                Remove-Item -Path $src -Recurse -Force -ErrorAction Stop
                Log "    [OK] Pasta origem apagada: $src" 'Green'
            } catch {
                Log "    [AVISO] Nao foi possivel apagar origem: $($_.Exception.Message)" 'Yellow'
            }
        }
        $ok++
    } else {
        Log "    [ERRO] robocopy exit=$rc -- ver $roboLog" 'Red'
        $errs++
    }
}

# ---------------------------------------------------------------
# Ficheiro solto na raiz
# ---------------------------------------------------------------
if ($looseFile -and $estudoDest) {
    Log ""
    Log "[SOLTO] $($looseFile.Name) -> $estudoDest" 'Yellow'
    if ($whatif) {
        Log "    [WHATIF] Moveria para: $estudoDest" 'DarkYellow'
    } else {
        try {
            Move-Item -LiteralPath $looseFile.FullName -Destination $estudoDest -Force -ErrorAction Stop
            Log "    [OK] Movido" 'Green'
            $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'
            $errs++
        }
    }
}

# ---------------------------------------------------------------
# Remover partilha SMB e pasta SHARED (se sem erros)
# ---------------------------------------------------------------
Log ""
Log "=== Resumo ===" 'Cyan'
Log "  Movidas:  $ok"
Log "  Saltadas: $skip"
Log "  Erros:    $errs" $(if ($errs) { 'Red' } else { 'White' })
Log "  Log: $log"

if (-not $whatif) {
    if ($errs -eq 0) {
        Log ""
        Log "[CLEANUP] A remover partilha SHARED e pasta..." 'Yellow'
        try {
            Remove-SmbShare -Name 'SHARED' -Force -ErrorAction Stop
            Log "    [OK] Partilha SMB 'SHARED' removida" 'Green'
        } catch {
            Log "    [AVISO] Partilha: $($_.Exception.Message)" 'Yellow'
        }
        # Apagar o que restar em SHARED (pastas vazias, etc.)
        if (Test-Path -LiteralPath $SharedRoot) {
            $restantes = (Get-ChildItem -LiteralPath $SharedRoot -Recurse -File -ErrorAction SilentlyContinue).Count
            if ($restantes -eq 0) {
                Remove-Item -Path $SharedRoot -Recurse -Force -ErrorAction SilentlyContinue
                Log "    [OK] $SharedRoot apagada" 'Green'
            } else {
                Log "    [AVISO] $SharedRoot ainda tem $restantes ficheiros -- verificar manualmente" 'Yellow'
            }
        }
    } else {
        Log ""
        Log "[AVISO] Ha erros -- SHARED NAO foi removida. Corrigir e re-executar." 'Red'
    }
}
