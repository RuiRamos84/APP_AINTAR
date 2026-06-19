<#
.SYNOPSIS
    Auditoria de dados -- tamanhos, idade dos ficheiros e tipos por partilha.
.DESCRIPTION
    Executar LOCALMENTE no fileserver, como Administrador. Apenas LEITURA.
    Pode demorar consoante o volume de dados.
    Gera CSVs na pasta .\Reports\ :
      - Dados-Pastas.csv      : tamanho e nr de ficheiros por pasta de 1o/2o nivel
      - Dados-Antigos.csv     : pastas onde NADA foi modificado ha mais de N anos
      - Dados-Extensoes.csv   : top extensoes por espaco ocupado
.PARAMETER AnosAntigo
    Ficheiros sem modificacao ha mais de N anos contam como "antigos" (default: 3)
.EXAMPLE
    .\2-Audit-Dados.ps1 -AnosAntigo 3
#>


[CmdletBinding()]
param(
    [int]$AnosAntigo = 3
)

$ErrorActionPreference = 'Continue'
$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$cutoff = (Get-Date).AddYears(-$AnosAntigo)

Write-Host "=== Auditoria de Dados -- $env:COMPUTERNAME -- $stamp ===" -ForegroundColor Cyan

$systemShares = @('ADMIN$', 'IPC$', 'print$')
$shares = Get-SmbShare | Where-Object {
    $_.Name -notin $systemShares -and $_.Name -notmatch '^[A-Z]\$$'
}

$pastaRows   = [System.Collections.Generic.List[object]]::new()
$antigoRows  = [System.Collections.Generic.List[object]]::new()
$extStats    = @{}

foreach ($s in $shares) {
    if (-not (Test-Path -LiteralPath $s.Path)) { continue }
    Write-Host "[*] A analisar partilha '$($s.Name)' ($($s.Path))..." -ForegroundColor Yellow

    # Pastas de 1o e 2o nivel
    $level1 = Get-ChildItem -LiteralPath $s.Path -Directory -ErrorAction SilentlyContinue
    $targets = [System.Collections.Generic.List[object]]::new()
    $targets.Add([PSCustomObject]@{ Nivel = 0; Path = $s.Path })
    foreach ($d1 in $level1) {
        $targets.Add([PSCustomObject]@{ Nivel = 1; Path = $d1.FullName })
        Get-ChildItem -LiteralPath $d1.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $targets.Add([PSCustomObject]@{ Nivel = 2; Path = $_.FullName })
        }
    }

    foreach ($t in ($targets | Where-Object Nivel -gt 0)) {
        $files = Get-ChildItem -LiteralPath $t.Path -File -Recurse -Force -ErrorAction SilentlyContinue
        $size  = ($files | Measure-Object Length -Sum).Sum
        $newest = if ($files.Count -gt 0) { ($files | Measure-Object LastWriteTime -Maximum).Maximum } else { $null }

        $pastaRows.Add([PSCustomObject]@{
            Partilha          = $s.Name
            Pasta             = $t.Path
            Nivel             = $t.Nivel
            Ficheiros         = $files.Count
            TamanhoMB         = [math]::Round(($size / 1MB), 1)
            UltimaModificacao = $newest
        })

        # Pasta "morta" -- nada modificado desde o cutoff
        if ($files.Count -gt 0 -and $newest -lt $cutoff) {
            $antigoRows.Add([PSCustomObject]@{
                Partilha          = $s.Name
                Pasta             = $t.Path
                Ficheiros         = $files.Count
                TamanhoMB         = [math]::Round(($size / 1MB), 1)
                UltimaModificacao = $newest
            })
        }

        # Estatistica de extensoes (apenas no nivel 1 para nao duplicar contagens)
        if ($t.Nivel -eq 1) {
            foreach ($f in $files) {
                $ext = if ($f.Extension) { $f.Extension.ToLower() } else { '(sem extensao)' }
                if (-not $extStats.ContainsKey($ext)) {
                    $extStats[$ext] = [PSCustomObject]@{ Extensao = $ext; Ficheiros = 0; TamanhoMB = 0.0 }
                }
                $extStats[$ext].Ficheiros++
                $extStats[$ext].TamanhoMB += $f.Length / 1MB
            }
        }
    }
}

$pastaRows | Sort-Object TamanhoMB -Descending |
    Export-Csv -Path (Join-Path $ReportDir "Dados-Pastas_$stamp.csv") -NoTypeInformation -Encoding UTF8
$antigoRows | Sort-Object TamanhoMB -Descending |
    Export-Csv -Path (Join-Path $ReportDir "Dados-Antigos_$stamp.csv") -NoTypeInformation -Encoding UTF8
$extStats.Values | ForEach-Object { $_.TamanhoMB = [math]::Round($_.TamanhoMB, 1); $_ } |
    Sort-Object TamanhoMB -Descending | Select-Object -First 30 |
    Export-Csv -Path (Join-Path $ReportDir "Dados-Extensoes_$stamp.csv") -NoTypeInformation -Encoding UTF8

$totalMB  = [math]::Round((($pastaRows | Where-Object Nivel -eq 1 | Measure-Object TamanhoMB -Sum).Sum), 0)
$mortoMB  = [math]::Round((($antigoRows | Measure-Object TamanhoMB -Sum).Sum), 0)

Write-Host "`nResumo:" -ForegroundColor Yellow
Write-Host ("    Total analisado:      {0:N0} MB" -f $totalMB)
Write-Host ("    Dados 'mortos' (>{0} anos): {1:N0} MB em {2} pastas" -f $AnosAntigo, $mortoMB, $antigoRows.Count)
Write-Host "`nRelatorios em: $ReportDir" -ForegroundColor Cyan
