<#
.SYNOPSIS
    Reorganiza subpastas da raiz de FILE_AINTAR para dentro dos departamentos corretos.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.
    Moves no mesmo volume = instantaneos, ACLs preservadas.
    PASTAS DIGITAIS NOVA COMPILACAO e fundida em Arquivo via robocopy.
    Usar -WhatIf para simular.
.EXAMPLE
    .\20-Reorganize-FileAintar.ps1 -WhatIf
    .\20-Reorganize-FileAintar.ps1
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Root = 'D:\FILE_AINTAR'
)

$ErrorActionPreference = 'Continue'
$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log    = Join-Path $ReportDir "Reorganize-FileAintar_$stamp.log"
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

# Lookup: nome normalizado -> FullName real
$fa = @{}
Get-ChildItem -LiteralPath $Root -Directory | ForEach-Object { $fa[(Normalize $_.Name)] = $_.FullName }

# Resolver paths dos destinos-pai (ja existem)
$ambiente  = $fa['AMBIENTE']
$operacao  = $fa['OPERACAO']
$dpas      = $fa['DPAS']
$ti        = $fa['TI']
$comum     = $fa['COMUM']
$arquivo   = $fa['ARQUIVO']

# Moves simples: @(src-normalizado, pasta-pai-destino)
$moves = [ordered]@{
    'QUALIDADE'                                     = $ambiente
    'CAUDAIS - REGISTO OPERACIONAL'                 = $operacao
    'ESTUDO MORTAGUA'                               = $dpas
    'PLANEAMENTO DE MANUTENCAO'                     = $dpas
    'PLANO DE ATIVIDADES 2026 - DPAS'               = $dpas
    'PEDIDOS'                                       = $dpas
    'SERVICO DE OBRAS POR ADMINISTRACAO DIRECTA'    = $dpas
    'GPS'                                           = $ti
    'FORMULARIOS E MINUTAS'                         = $comum
}

Log "=== Reorganizacao FILE_AINTAR -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO (-WhatIf)" 'Yellow' }
Log "Raiz: $Root"
Log ""

$ok   = 0
$skip = 0
$errs = 0

# ---------------------------------------------------------------
# 1. Moves simples (mesmo volume -- instantaneo)
# ---------------------------------------------------------------
Log "[MOVER] Subpastas para departamentos..." 'Yellow'

foreach ($normKey in $moves.Keys) {
    $dstParent = $moves[$normKey]

    # Encontrar pasta real pelo nome normalizado
    $srcFolder = Get-ChildItem -LiteralPath $Root -Directory |
                     Where-Object { (Normalize $_.Name) -eq $normKey } |
                     Select-Object -First 1

    if (-not $srcFolder) {
        Log "  [SKIP] Nao encontrada na raiz: $normKey" 'Gray'
        $skip++
        continue
    }
    if (-not $dstParent) {
        Log "  [ERRO] Pasta destino-pai nao resolvida para: $normKey" 'Red'
        $errs++
        continue
    }

    $dst = Join-Path $dstParent $srcFolder.Name

    if (Test-Path -LiteralPath $dst) {
        Log "  [SKIP] Ja existe no destino: $dst" 'DarkYellow'
        $skip++
        continue
    }

    Log "  $($srcFolder.Name)  ->  $dst" 'Cyan'

    if (-not $whatif) {
        try {
            Move-Item -LiteralPath $srcFolder.FullName -Destination $dst -ErrorAction Stop
            Log "    [OK] Movido" 'Green'
            $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'
            $errs++
        }
    } else {
        Log "    [WHATIF] Move-Item '$($srcFolder.FullName)' -> '$dst'" 'DarkYellow'
        $ok++
    }
}

# ---------------------------------------------------------------
# 2. PASTAS DIGITAIS NOVA COMPILACAO -> fundir em Arquivo
# ---------------------------------------------------------------
Log ""
Log "[FUNDIR] PASTAS DIGITAIS NOVA COMPILACAO -> Arquivo" 'Yellow'

$pastasDigitais = Get-ChildItem -LiteralPath $Root -Directory |
                      Where-Object { (Normalize $_.Name) -eq 'PASTAS DIGITAIS NOVA COMPILACAO' } |
                      Select-Object -First 1

if (-not $pastasDigitais) {
    Log "  [SKIP] 'PASTAS DIGITAIS NOVA COMPILACAO' nao encontrada na raiz" 'Gray'
    $skip++
} elseif (-not $arquivo) {
    Log "  [ERRO] Pasta 'Arquivo' nao resolvida" 'Red'
    $errs++
} else {
    $roboLog = Join-Path $ReportDir "robo_PastasDigitais_$stamp.log"
    Log "  src: $($pastasDigitais.FullName)" 'DarkGray'
    Log "  dst: $arquivo" 'DarkGray'

    if ($whatif) {
        & robocopy $pastasDigitais.FullName $arquivo /E /MOVE /NP /L /LOG+:$roboLog 2>&1 | Out-Null
        Log "  [WHATIF] robocopy /MOVE simulado" 'DarkYellow'
        $ok++
    } else {
        & robocopy $pastasDigitais.FullName $arquivo /E /COPYALL /DCOPY:DAT /MOVE /R:3 /W:5 /NP /LOG+:$roboLog 2>&1 | Out-Null
        $rc = $LASTEXITCODE
        if ($rc -le 3) {
            # Apagar pasta vazia
            if (Test-Path -LiteralPath $pastasDigitais.FullName) {
                Remove-Item -LiteralPath $pastasDigitais.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
            Log "  [OK] Fundido em Arquivo (robocopy exit=$rc)" 'Green'
            $ok++
        } else {
            Log "  [ERRO] robocopy exit=$rc -- ver $roboLog" 'Red'
            $errs++
        }
    }
}

# ---------------------------------------------------------------
# 3. Ficheiros soltos na raiz
# ---------------------------------------------------------------
Log ""
Log "[SOLTOS] Ficheiros na raiz de FILE_AINTAR:" 'Yellow'
$soltos = Get-ChildItem -LiteralPath $Root -File -ErrorAction SilentlyContinue
if ($soltos) {
    foreach ($f in $soltos) {
        Log "  $($f.Name)  [$([math]::Round($f.Length/1KB,1)) KB]  -- mover manualmente para o departamento correto" 'Yellow'
    }
} else {
    Log "  Nenhum ficheiro solto na raiz" 'Gray'
}

# ---------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------
Log ""
Log "=== Resumo ===" 'Cyan'
Log "  OK:      $ok"
Log "  Saltadas: $skip"
Log "  Erros:    $errs" $(if ($errs) { 'Red' } else { 'White' })
Log "  Log: $log"
Log ""

# Estrutura final
if (-not $whatif) {
    Log "Estrutura final da raiz:" 'Cyan'
    Get-ChildItem -LiteralPath $Root -Directory | Sort-Object Name | ForEach-Object {
        Log "  $($_.Name)" 'Gray'
    }
}
