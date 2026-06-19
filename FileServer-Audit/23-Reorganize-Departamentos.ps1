<#
.SYNOPSIS
    Reorganiza FILE_AINTAR para refletir a estrutura por departamentos/equipas.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.

    Ações:
      1. Apaga DAGF\RH e DAGF\Recursos Humanos (vazios)
      2. Move raiz\RH         -> DAGF\RH
      3. Cria ADMINISTRACAO\  com traversal para TI_RW, JURIDICO_RW/RO, DIR_RW
      4. Move raiz\TI         -> ADMINISTRACAO\TI
      5. Move raiz\Juridico   -> ADMINISTRACAO\Juridico
      6. Cria ADMINISTRACAO\Estrategia  (nova, vazia)
      7. Cria DAGF\Comunicacao          (nova, vazia)

    Usar -WhatIf para simular.
#>

[CmdletBinding(SupportsShouldProcess)]
param([string]$Root = 'D:\FILE_AINTAR')

$ErrorActionPreference = 'Continue'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log   = Join-Path $PSScriptRoot "Reports\Reorganize-Departamentos_$stamp.log"
New-Item -ItemType Directory -Path (Split-Path $log) -Force | Out-Null
$whatif = $PSCmdlet.MyInvocation.BoundParameters.ContainsKey('WhatIf')

function Log($msg, $color = 'White') {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue
}

function New-ACE {
    param(
        [string]$Identity,
        [string]$Rights,
        [string]$Type        = 'Allow',
        [string]$Inheritance = 'ContainerInherit,ObjectInherit',
        [string]$Propagation = 'None'
    )
    New-Object System.Security.AccessControl.FileSystemAccessRule(
        [System.Security.Principal.NTAccount]$Identity,
        [System.Security.AccessControl.FileSystemRights]$Rights,
        [System.Security.AccessControl.InheritanceFlags]$Inheritance,
        [System.Security.AccessControl.PropagationFlags]$Propagation,
        [System.Security.AccessControl.AccessControlType]$Type
    )
}

$ok = 0; $errs = 0

Log "=== Reorganizacao Departamentos FILE_AINTAR -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO (-WhatIf)" 'Yellow' }

# ---------------------------------------------------------------
# 1. Apagar pastas DAGF\RH e DAGF\Recursos Humanos (vazias)
# ---------------------------------------------------------------
Log "" ; Log "[1] Remover pastas RH duplicadas vazias em DAGF\..." 'Yellow'

foreach ($dup in @('RH', 'Recursos Humanos')) {
    $p = Join-Path $Root "DAGF\$dup"
    if (Test-Path -LiteralPath $p) {
        $count = @(Get-ChildItem -LiteralPath $p -Recurse -ErrorAction SilentlyContinue).Count
        if ($count -gt 0) {
            Log "  [SKIP] DAGF\$dup tem $count items -- nao apagar" 'DarkYellow'
        } else {
            Log "  Remove DAGF\$dup (vazia)" 'Cyan'
            if (-not $whatif) {
                try {
                    Remove-Item -LiteralPath $p -Force -ErrorAction Stop
                    Log "    [OK] Removida" 'Green'; $ok++
                } catch {
                    Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
                }
            } else {
                Log "    [WHATIF] Remove-Item '$p'" 'DarkYellow'; $ok++
            }
        }
    } else {
        Log "  [SKIP] DAGF\$dup nao existe" 'Gray'
    }
}

# ---------------------------------------------------------------
# 2. Mover raiz\RH -> DAGF\RH
# ---------------------------------------------------------------
Log "" ; Log "[2] Mover RH -> DAGF\RH..." 'Yellow'

$srcRH = Join-Path $Root 'RH'
$dstRH = Join-Path $Root 'DAGF\RH'

if (-not (Test-Path -LiteralPath $srcRH)) {
    Log "  [SKIP] RH nao existe na raiz" 'Gray'
} elseif (Test-Path -LiteralPath $dstRH) {
    Log "  [SKIP] DAGF\RH ja existe" 'DarkYellow'
} else {
    Log "  $srcRH  ->  $dstRH" 'Cyan'
    if (-not $whatif) {
        try {
            Move-Item -LiteralPath $srcRH -Destination $dstRH -ErrorAction Stop
            Log "    [OK] Movido" 'Green'; $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] Move-Item '$srcRH' -> '$dstRH'" 'DarkYellow'; $ok++
    }
}

# ---------------------------------------------------------------
# 3. Criar pasta ADMINISTRACAO com ACLs de traversal
#    SYSTEM + Admins: FullControl (com heranca)
#    SG_FS_TI_RW, SG_FS_DIR_RW, SG_FS_JURIDICO_RW, SG_FS_JURIDICO_RO:
#      ReadAndExecute nesta pasta APENAS (sem heranca para subpastas)
# ---------------------------------------------------------------
Log "" ; Log "[3] Criar ADMINISTRACAO\ com ACLs de traversal..." 'Yellow'

$adminPath = Join-Path $Root 'ADMINISTRACAO'

if (-not (Test-Path -LiteralPath $adminPath)) {
    Log "  Criar $adminPath" 'Cyan'
    if (-not $whatif) {
        try {
            New-Item -ItemType Directory -Path $adminPath -Force | Out-Null
            Log "    [OK] Pasta criada" 'Green'
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] New-Item '$adminPath'" 'DarkYellow'
    }
} else {
    Log "  [SKIP] ADMINISTRACAO ja existe" 'Gray'
}

if (-not $whatif) {
    try {
        $acl = Get-Acl -LiteralPath $adminPath
        $acl.SetAccessRuleProtection($true, $false)
        $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

        # Controlo total para sistema e admins (com heranca)
        $acl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'    'FullControl'))
        $acl.AddAccessRule((New-ACE 'BUILTIN\Administrators' 'FullControl'))

        # Traversal apenas nesta pasta para os grupos de cada subpasta
        $traversalGroups = @(
            'AINTAR\SG_FS_TI_RW',
            'AINTAR\SG_FS_DIR_RW',
            'AINTAR\SG_FS_JURIDICO_RW',
            'AINTAR\SG_FS_JURIDICO_RO'
        )
        foreach ($grp in $traversalGroups) {
            try {
                $acl.AddAccessRule((New-ACE $grp 'ReadAndExecute, Synchronize' 'Allow' 'None' 'None'))
                Log "    Traversal: $grp" 'Gray'
            } catch {
                Log "    [AVISO] Grupo nao encontrado, ignorado: $grp" 'DarkYellow'
            }
        }

        Set-Acl -LiteralPath $adminPath -AclObject $acl -ErrorAction Stop
        Log "  [OK] ACL ADMINISTRACAO\ configurada" 'Green'; $ok++
    } catch {
        Log "  [ERRO] ACL: $($_.Exception.Message)" 'Red'; $errs++
    }
} else {
    Log "  [WHATIF] Configuraria ACL: SYSTEM+Admins=FullControl, grupos TI/JURIDICO/DIR=Traversal" 'DarkYellow'
}

# ---------------------------------------------------------------
# 4. Mover TI -> ADMINISTRACAO\TI
# 5. Mover Juridico -> ADMINISTRACAO\Juridico
# ---------------------------------------------------------------
Log "" ; Log "[4+5] Mover TI e Juridico -> ADMINISTRACAO\..." 'Yellow'

$moves = [ordered]@{
    'TI'      = 'ADMINISTRACAO\TI'
    'Juridico' = 'ADMINISTRACAO\Juridico'
}

foreach ($srcName in $moves.Keys) {
    $src = Join-Path $Root $srcName
    $dst = Join-Path $Root $moves[$srcName]

    if (-not (Test-Path -LiteralPath $src)) {
        Log "  [SKIP] $srcName nao existe na raiz" 'Gray'; continue
    }
    if (Test-Path -LiteralPath $dst) {
        Log "  [SKIP] $($moves[$srcName]) ja existe" 'DarkYellow'; continue
    }

    Log "  $src  ->  $dst" 'Cyan'
    if (-not $whatif) {
        try {
            Move-Item -LiteralPath $src -Destination $dst -ErrorAction Stop
            Log "    [OK] Movido" 'Green'; $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] Move-Item '$src' -> '$dst'" 'DarkYellow'; $ok++
    }
}

# ---------------------------------------------------------------
# 6. Criar ADMINISTRACAO\Estrategia (nova, vazia)
# ---------------------------------------------------------------
Log "" ; Log "[6] Criar ADMINISTRACAO\Estrategia..." 'Yellow'

$estrategiaPath = Join-Path $Root 'ADMINISTRACAO\Estrategia'
if (Test-Path -LiteralPath $estrategiaPath) {
    Log "  [SKIP] Ja existe" 'Gray'
} else {
    Log "  Criar $estrategiaPath" 'Cyan'
    if (-not $whatif) {
        try {
            New-Item -ItemType Directory -Path $estrategiaPath -Force | Out-Null
            Log "    [OK] Criada (herda ACL de ADMINISTRACAO)" 'Green'; $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] New-Item '$estrategiaPath'" 'DarkYellow'; $ok++
    }
}

# ---------------------------------------------------------------
# 7. Criar DAGF\Comunicacao (nova, vazia)
# ---------------------------------------------------------------
Log "" ; Log "[7] Criar DAGF\Comunicacao..." 'Yellow'

$comunicacaoPath = Join-Path $Root 'DAGF\Comunicacao'
if (Test-Path -LiteralPath $comunicacaoPath) {
    Log "  [SKIP] Ja existe" 'Gray'
} else {
    Log "  Criar $comunicacaoPath" 'Cyan'
    if (-not $whatif) {
        try {
            New-Item -ItemType Directory -Path $comunicacaoPath -Force | Out-Null
            Log "    [OK] Criada (herda ACL de DAGF)" 'Green'; $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'; $errs++
        }
    } else {
        Log "    [WHATIF] New-Item '$comunicacaoPath'" 'DarkYellow'; $ok++
    }
}

# ---------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------
Log "" ; Log "=== Resumo ===" 'Cyan'
Log "  OK:    $ok"
Log "  Erros: $errs" $(if ($errs) { 'Red' } else { 'White' })

if (-not $whatif) {
    Log "" ; Log "Estrutura final da raiz:" 'Cyan'
    Get-ChildItem -LiteralPath $Root -Directory | Sort-Object Name |
        ForEach-Object { Log "  $($_.Name)" 'Gray' }

    Log "" ; Log "ADMINISTRACAO\:" 'Cyan'
    Get-ChildItem -LiteralPath (Join-Path $Root 'ADMINISTRACAO') -Directory | Sort-Object Name |
        ForEach-Object { Log "  $($_.Name)" 'Gray' }

    Log "" ; Log "DAGF\:" 'Cyan'
    Get-ChildItem -LiteralPath (Join-Path $Root 'DAGF') -Directory | Sort-Object Name |
        ForEach-Object { Log "  $($_.Name)" 'Gray' }
}
