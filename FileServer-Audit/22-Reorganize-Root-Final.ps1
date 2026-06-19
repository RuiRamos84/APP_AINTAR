<#
.SYNOPSIS
    Move pastas da raiz de FILE_AINTAR para dentro dos departamentos corretos.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.
    Mesmo volume = Move-Item instantaneo, ACLs preservadas.
    Usar -WhatIf para simular.
#>

[CmdletBinding(SupportsShouldProcess)]
param([string]$Root = 'D:\FILE_AINTAR')

$ErrorActionPreference = 'Continue'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log   = Join-Path $PSScriptRoot "Reports\Reorganize-Root-Final_$stamp.log"
New-Item -ItemType Directory -Path (Split-Path $log) -Force | Out-Null
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

# Lookup: nome normalizado -> path real
$fa = @{}
Get-ChildItem -LiteralPath $Root -Directory | ForEach-Object { $fa[(Normalize $_.Name)] = $_.FullName }

$dpas  = $fa['DPAS']
$comum = $fa['COMUM']

# Moves: chave normalizada da origem -> pasta pai destino
$moves = [ordered]@{
    'AMBIENTE'                                    = $dpas
    'OPERACAO'                                    = $dpas
    'PLANEAMENTO_PROJETOS_CONTROLO_EMPREITADAS'   = $dpas
    'GERAL'                                       = $comum
    'OUTROS'                                      = $comum
}

Log "=== Reorganizacao Raiz FILE_AINTAR -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO (-WhatIf)" 'Yellow' }

$ok = 0; $skip = 0; $errs = 0

foreach ($normKey in $moves.Keys) {
    $dstParent = $moves[$normKey]

    # Encontrar a pasta real pelo nome normalizado (match parcial para Planeamento*)
    $src = Get-ChildItem -LiteralPath $Root -Directory |
               Where-Object { (Normalize $_.Name) -like "$normKey*" } |
               Select-Object -First 1

    if (-not $src) {
        Log "  [SKIP] Nao encontrada: $normKey" 'Gray'; $skip++; continue
    }
    if (-not $dstParent) {
        Log "  [ERRO] Destino pai nao resolvido para: $normKey" 'Red'; $errs++; continue
    }

    $dst = Join-Path $dstParent $src.Name

    if (Test-Path -LiteralPath $dst) {
        Log "  [SKIP] Ja existe no destino: $dst" 'DarkYellow'; $skip++; continue
    }

    Log "  $($src.Name)  ->  $dst" 'Cyan'

    if (-not $whatif) {
        try {
            Move-Item -LiteralPath $src.FullName -Destination $dst -ErrorAction Stop
            Log "    [OK] Movido" 'Green'; $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] Move-Item '$($src.FullName)' -> '$dst'" 'DarkYellow'; $ok++
    }
}

Log ""
Log "=== Resumo ===" 'Cyan'
Log "  OK:      $ok"
Log "  Saltadas: $skip"
Log "  Erros:    $errs" $(if ($errs) { 'Red' } else { 'White' })

if (-not $whatif) {
    Log ""
    Log "Estrutura final da raiz:" 'Cyan'
    Get-ChildItem -LiteralPath $Root -Directory | Sort-Object Name |
        ForEach-Object { Log "  $($_.Name)" 'Gray' }
}
