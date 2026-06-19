<#
.SYNOPSIS
    Apaga do SHARED ficheiros que ja existem identicos em FILE_AINTAR.
.DESCRIPTION
    Executar NO FILESERVER, como Administrador.
    Para cada par de pastas SHARED->FILE_AINTAR: se o ficheiro ja existe no destino
    com o mesmo tamanho, apaga da origem -- libertando espaco sem risco de perda.
    Usar -WhatIf primeiro para ver o que seria apagado.
.EXAMPLE
    .\19-Purge-Duplicates.ps1 -WhatIf
    .\19-Purge-Duplicates.ps1
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
$log    = Join-Path $ReportDir "Purge-Duplicates_$stamp.log"
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

$sh = Get-FolderLookup $SharedRoot
$fa = Get-FolderLookup $FileAintarRoot

# Pares a verificar: origem SHARED -> destino FILE_AINTAR
$pairs = [ordered]@{
    'DGAF'               = @($sh['DGAF'],               $fa['DAGF'])
    'DPAS'               = @($sh['DPAS'],               $fa['DPAS'])
    'GERAL'              = @($sh['GERAL'],              $fa['GERAL'])
    'LICENCIAMENTOS'     = @($sh['LICENCIAMENTOS'],     (Join-Path $fa['DPAS'] 'Licenciamentos'))
    'PLANEAMENTO'        = @($sh['PLANEAMENTO'],        ($fa.Keys | Where-Object { $_ -like 'PLANEAMENTO*EMPREITADAS*' } | Select-Object -First 1 | ForEach-Object { $fa[$_] }))
    'PROCESSOS DIGITAIS' = @($sh['PROCESSOS DIGITAIS'], $fa['ARQUIVO'])
    'QUALIDADE'          = @($sh['QUALIDADE'],          (Join-Path $FileAintarRoot 'Qualidade'))
    'SERVICO'            = @((Get-ChildItem -LiteralPath $SharedRoot -Directory | Where-Object { (Normalize $_.Name) -eq 'SERVICO' } | Select-Object -First 1 -ExpandProperty FullName), (Join-Path $fa['OPERACAO'] 'Servico'))
    'TEMP'               = @($sh['TEMP'],               $fa['TEMPORARIO'])
}

Log "=== Purge Duplicados SHARED -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO -- nenhum ficheiro sera apagado" 'Yellow' }

$totalApagados  = 0
$totalBytes     = 0
$totalErros     = 0

foreach ($label in $pairs.Keys) {
    $src = $pairs[$label][0]
    $dst = $pairs[$label][1]

    if (-not $src -or -not (Test-Path -LiteralPath $src)) {
        Log ""
        Log "  [SKIP] $label -- origem nao existe (ja movida?)" 'Gray'
        continue
    }
    if (-not $dst -or -not (Test-Path -LiteralPath $dst)) {
        Log ""
        Log "  [SKIP] $label -- destino nao existe ainda, nada a purgar" 'DarkYellow'
        continue
    }

    Log ""
    Log "  [$label]  src=$src  dst=$dst" 'Cyan'

    $srcLen = $src.Length
    $apagados = 0
    $bytes    = 0

    Get-ChildItem -LiteralPath $src -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $srcFile = $_
        $relPath = $srcFile.FullName.Substring($srcLen).TrimStart('\')
        $dstFile = Join-Path $dst $relPath

        if (Test-Path -LiteralPath $dstFile) {
            $dstInfo = Get-Item -LiteralPath $dstFile -ErrorAction SilentlyContinue
            if ($dstInfo -and $dstInfo.Length -eq $srcFile.Length) {
                # Ficheiro identico (mesmo tamanho) -- apagar da origem
                if ($whatif) {
                    Log "    [WHATIF] Apagaria ($([math]::Round($srcFile.Length/1KB,1)) KB): $($srcFile.FullName)" 'DarkYellow'
                } else {
                    try {
                        Remove-Item -LiteralPath $srcFile.FullName -Force -ErrorAction Stop
                        $apagados++
                        $bytes += $srcFile.Length
                    } catch {
                        Log "    [ERRO] $($srcFile.FullName): $($_.Exception.Message)" 'Red'
                        $totalErros++
                    }
                }
                $apagados += if ($whatif) { 1 } else { 0 }
                $bytes    += if ($whatif) { $srcFile.Length } else { 0 }
            }
        }
    }

    $mbLiberado = [math]::Round($bytes / 1MB, 1)
    if ($whatif) {
        Log "    -> Libertaria: $apagados ficheiros, $mbLiberado MB" 'Green'
    } else {
        Log "    -> Apagados: $apagados ficheiros, $mbLiberado MB libertados" 'Green'
        $totalApagados += $apagados
        $totalBytes    += $bytes
    }

    # Apagar pastas vazias na origem (mais profundas primeiro)
    if (-not $whatif) {
        Get-ChildItem -LiteralPath $src -Recurse -Directory -ErrorAction SilentlyContinue |
            Sort-Object { $_.FullName.Length } -Descending |
            ForEach-Object {
                if (Test-Path -LiteralPath $_.FullName) {
                    $items = Get-ChildItem -LiteralPath $_.FullName -ErrorAction SilentlyContinue
                    if (-not $items) {
                        Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
            }
    }
}

Log ""
Log "=== Resumo ===" 'Cyan'
if ($whatif) {
    Log "  (WhatIf -- nenhuma alteracao feita)"
} else {
    Log "  Ficheiros apagados: $totalApagados"
    Log "  Espaco libertado:   $([math]::Round($totalBytes/1GB,2)) GB"
    Log "  Erros:              $totalErros" $(if ($totalErros) { 'Red' } else { 'White' })
}
Log "  Log: $log"
Log ""
Log "PROXIMO PASSO: Executar 18-Migrate-SHARED-to-FileAintar.ps1 para mover o restante" 'Yellow'
