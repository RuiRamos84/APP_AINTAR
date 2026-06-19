<#
.SYNOPSIS
    Remove SIDs órfãos (contas apagadas) das ACLs NTFS do SHARED.
.DESCRIPTION
    Executar NO FILESERVER (\\172.16.2.35), como Administrador.
    Apenas remove os 3 SIDs identificados na auditoria -- nao toca em mais nada.
    Usar -WhatIf primeiro para validar.
.PARAMETER Root
    Caminho da pasta raiz (default: D:\SHARED)
.PARAMETER WhatIf
    Simula sem alterar nada.
.EXAMPLE
    .\14-Remove-OrphanSIDs.ps1 -WhatIf
    .\14-Remove-OrphanSIDs.ps1
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Root = 'D:\SHARED'
)

$ErrorActionPreference = 'Continue'

$orphanSIDs = @(
    'S-1-5-21-3714696651-40073255-3363414880-1137',  # 483 pastas
    'S-1-5-21-3714696651-40073255-3363414880-1166',  # 481 pastas
    'S-1-5-21-3714696651-40073255-3363414880-1167'   # 140 pastas
)

$stamp   = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\RemoveOrphanSIDs_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

$whatif = $PSCmdlet.MyInvocation.BoundParameters.ContainsKey('WhatIf')
if ($whatif) {
    Log "=== MODO SIMULACAO (-WhatIf) -- nenhuma alteracao sera feita ==="
} else {
    Log "=== Remocao de SIDs orfaos -- $Root -- $stamp ==="
}

Log "SIDs alvo: $($orphanSIDs -join ', ')"

$total    = 0
$removido = 0
$erros    = 0

# Recolher todas as pastas recursivamente
$folders = Get-ChildItem -LiteralPath $Root -Recurse -Directory -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName
$folders = @($Root) + @($folders)

Log "Pastas a analisar: $($folders.Count)"

foreach ($folder in $folders) {
    try {
        $acl = Get-Acl -LiteralPath $folder -ErrorAction Stop
    } catch {
        Log "[ERRO] Nao foi possivel ler ACL de: $folder -- $($_.Exception.Message)"
        $erros++
        continue
    }

    $modified = $false
    foreach ($sid in $orphanSIDs) {
        $matches = $acl.Access | Where-Object {
            $_.IdentityReference.Value -eq $sid
        }
        foreach ($ace in $matches) {
            $total++
            if ($whatif) {
                Log "[WHATIF] Removeria de '$folder': $sid ($($ace.FileSystemRights))"
            } else {
                try {
                    $acl.RemoveAccessRule($ace) | Out-Null
                    $modified = $true
                    $removido++
                    Log "[OK] Removido de '$folder': $sid"
                } catch {
                    Log "[ERRO] Falhou remover $sid de '$folder': $($_.Exception.Message)"
                    $erros++
                }
            }
        }
    }

    if ($modified -and -not $whatif) {
        try {
            Set-Acl -LiteralPath $folder -AclObject $acl -ErrorAction Stop
        } catch {
            Log "[ERRO] Set-Acl falhou em '$folder': $($_.Exception.Message)"
            $erros++
        }
    }
}

Log ""
Log "=== Resumo ==="
if ($whatif) {
    Log "  ACEs que seriam removidas: $total"
} else {
    Log "  ACEs removidas:  $removido"
    Log "  Erros:           $erros"
}
Log "Log em: $logFile"
