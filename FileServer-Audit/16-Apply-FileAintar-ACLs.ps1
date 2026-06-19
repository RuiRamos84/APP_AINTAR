<#
.SYNOPSIS
    Aplica ACLs por grupo em todos os departamentos de D:\FILE_AINTAR.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.
    Usa nomes normalizados (sem acentos) para comparar com as pastas reais,
    evitando problemas de encoding entre maquinas.
    - Raiz: remove Authenticated Users=Modify e rui.ramos; fica so traversal
    - Cada subpasta: quebra heranca, aplica grupos SG_FS_* conforme mapeamento
    - Apaga D:\FILE_AINTAR\Direcao (sem acento - pasta duplicada)
    - Salta DAGF (ja configurada no piloto 15-Pilot-DAGF.ps1)
.PARAMETER Root
    Caminho raiz (default: D:\FILE_AINTAR)
.PARAMETER WhatIf
    Simula sem alterar nada.
.PARAMETER Rollback
    Restaura todas as ACLs a partir dos backups.
.EXAMPLE
    .\16-Apply-FileAintar-ACLs.ps1 -WhatIf
    .\16-Apply-FileAintar-ACLs.ps1
    .\16-Apply-FileAintar-ACLs.ps1 -Rollback
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Root    = 'D:\FILE_AINTAR',
    [switch]$Rollback
)

$ErrorActionPreference = 'Continue'

$ReportDir = Join-Path $PSScriptRoot 'Reports'
$BackupDir = Join-Path $ReportDir 'Backups-FileAintar'
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log   = Join-Path $ReportDir "Apply-FileAintar_$stamp.log"

function Log($msg, $color = 'White') {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue
}

# Normaliza nome: remove acentos, maiusculas, para comparacao
function Normalize([string]$s) {
    $norm = $s.Normalize([System.Text.NormalizationForm]::FormD)
    $chars = $norm.ToCharArray() | Where-Object {
        [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne `
        [System.Globalization.UnicodeCategory]::NonSpacingMark
    }
    return ([string]::new($chars)).ToUpperInvariant().Trim()
}

# ---------------------------------------------------------------
# Mapeamento: chave = nome normalizado (sem acentos, maiusculas)
#             valor = @(GroupRW, GroupRO)  -- '' = nenhum
# ---------------------------------------------------------------
$folderMap = @{
    'AMBIENTE'                                      = @('AINTAR\SG_FS_AMBIENTE_RW',  'AINTAR\SG_FS_AMBIENTE_RO')
    'ARQUIVO'                                       = @('',                           'AINTAR\SG_FS_Geral_R')
    'CAUDAIS - REGISTO OPERACIONAL'                 = @('AINTAR\SG_FS_OPERACAO_RW',  'AINTAR\SG_FS_OPERACAO_RO')
    'COMUM'                                         = @('AINTAR\SG_FS_COMUM_RW',     '')
    'DAGF'                                          = $null   # ja configurado no piloto -- saltar
    'DPAS'                                          = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'DIRECAO'                                       = @('AINTAR\SG_FS_DIR_RW',       'AINTAR\SG_FS_DIR_RO')
    'ESTUDO MORTAGUA'                               = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'FORMULARIOS E MINUTAS'                         = @('AINTAR\SG_FS_COMUM_RW',     '')
    'GPS'                                           = @('AINTAR\SG_FS_TI_RW',        '')
    'GERAL'                                         = @('AINTAR\SG_FS_Geral_RW',     'AINTAR\SG_FS_Geral_R')
    'JURIDICO'                                      = @('AINTAR\SG_FS_JURIDICO_RW',  'AINTAR\SG_FS_JURIDICO_RO')
    'OPERACAO'                                      = @('AINTAR\SG_FS_OPERACAO_RW',  'AINTAR\SG_FS_OPERACAO_RO')
    'OUTROS'                                        = @('AINTAR\SG_FS_COMUM_RW',     '')
    'PASTAS DIGITAIS NOVA COMPILACAO'               = @('AINTAR\SG_FS_COMUM_RW',     '')
    'PLANEAMENTO DE MANUTENCAO'                     = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'PEDIDOS'                                       = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'PLANEAMENTO_PROJETOS_CONTROLO_EMPREITADAS'     = @('AINTAR\SG_FS_PROJ_RW',      'AINTAR\SG_FS_PROJ_RO')
    'PLANO DE ATIVIDADES 2026 - DPAS'              = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'RH'                                            = @('AINTAR\SG_FS_RH_RW',        'AINTAR\SG_FS_RH_RO')
    'SCANNER'                                       = @('AINTAR\SG_FS_SCANNER_RW',   '')
    'SERVICO DE OBRAS POR ADMINISTRACAO DIRECTA'    = @('AINTAR\SG_FS_DPAS_RW',      'AINTAR\SG_FS_DPAS_RO')
    'TI'                                            = @('AINTAR\SG_FS_TI_RW',        '')
    'TEMPORARIO'                                    = @('AINTAR\SG_FS_TEMP_RW',      '')
}

# Pasta a apagar (sem acento -- sem problemas de encoding)
$deleteTarget = 'Direcao'

# ---------------------------------------------------------------
# ROLLBACK
# ---------------------------------------------------------------
if ($Rollback) {
    Log "=== ROLLBACK -- $Root ===" 'Cyan'
    $backups = Get-ChildItem $BackupDir -Filter '*.sddl' -ErrorAction SilentlyContinue
    if (-not $backups) { Log "Nenhum backup encontrado em $BackupDir" 'Red'; exit 1 }
    foreach ($b in $backups) {
        $safeName = [System.IO.Path]::GetFileNameWithoutExtension($b.Name)
        if ($safeName -eq '_ROOT') {
            $target = $Root
        } else {
            # Encontrar pasta real pelo nome normalizado
            $target = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue |
                Where-Object { (Normalize $_.Name) -eq (Normalize $safeName) } |
                Select-Object -First 1 -ExpandProperty FullName
        }
        if (-not $target -or -not (Test-Path -LiteralPath $target)) {
            Log "[SKIP] Pasta nao encontrada para backup '$safeName'" 'DarkYellow'
            continue
        }
        $sddl = Get-Content $b.FullName -Raw
        $acl  = Get-Acl -LiteralPath $target
        $acl.SetSecurityDescriptorSddlForm($sddl)
        if ($PSCmdlet.ShouldProcess($target, "Restaurar ACL")) {
            Set-Acl -LiteralPath $target -AclObject $acl
            Log "[OK] Restaurado: $target" 'Green'
        }
    }
    Log "=== Rollback concluido ===" 'Cyan'
    exit 0
}

# ---------------------------------------------------------------
# Helper: criar ACE
# ---------------------------------------------------------------
function New-ACE {
    param(
        [string]$Identity,
        [string]$Rights,
        [string]$Type        = 'Allow',
        [string]$Inheritance = 'ContainerInherit,ObjectInherit',
        [string]$Propagation = 'None'
    )
    $ir = [System.Security.Principal.NTAccount]$Identity
    $fs = [System.Security.AccessControl.FileSystemRights]$Rights
    $it = [System.Security.AccessControl.InheritanceFlags]$Inheritance
    $pt = [System.Security.AccessControl.PropagationFlags]$Propagation
    $at = [System.Security.AccessControl.AccessControlType]$Type
    return New-Object System.Security.AccessControl.FileSystemAccessRule($ir, $fs, $it, $pt, $at)
}

# ---------------------------------------------------------------
# Helper: aplicar ACL a uma pasta
# ---------------------------------------------------------------
function Set-FolderACL {
    param([string]$Path, [string]$GroupRW, [string]$GroupRO, [string]$SafeKey)

    $backupFile = Join-Path $BackupDir "$SafeKey.sddl"

    $acl  = Get-Acl -LiteralPath $Path -ErrorAction Stop
    $sddl = $acl.GetSecurityDescriptorSddlForm('All')
    if ($PSCmdlet.ShouldProcess($backupFile, "Guardar backup")) {
        Set-Content -Path $backupFile -Value $sddl -Encoding UTF8
    }

    if ($PSCmdlet.ShouldProcess($Path, "Aplicar ACL (RW=$GroupRW RO=$GroupRO)")) {
        $newAcl = Get-Acl -LiteralPath $Path
        $newAcl.SetAccessRuleProtection($true, $false)
        $newAcl.Access | ForEach-Object { $newAcl.RemoveAccessRule($_) | Out-Null }

        $newAcl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'   'FullControl'))
        $newAcl.AddAccessRule((New-ACE 'BUILTIN\Administrators' 'FullControl'))
        if ($GroupRW -ne '') { $newAcl.AddAccessRule((New-ACE $GroupRW 'Modify, Synchronize')) }
        if ($GroupRO -ne '') { $newAcl.AddAccessRule((New-ACE $GroupRO 'ReadAndExecute, Synchronize')) }

        Set-Acl -LiteralPath $Path -AclObject $newAcl -ErrorAction Stop
    }
}

# ---------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------
Log "=== Aplicar ACLs FILE_AINTAR -- $stamp ===" 'Cyan'
Log "Raiz: $Root"
$ok = 0; $skip = 0; $err = 0

# 1. Raiz
Log ""
Log "[RAIZ] A corrigir $Root ..." 'Yellow'
try {
    $rootAcl = Get-Acl -LiteralPath $Root
    if ($PSCmdlet.ShouldProcess((Join-Path $BackupDir '_ROOT.sddl'), "Guardar backup raiz")) {
        Set-Content -Path (Join-Path $BackupDir '_ROOT.sddl') -Value `
            $rootAcl.GetSecurityDescriptorSddlForm('All') -Encoding UTF8
    }
    if ($PSCmdlet.ShouldProcess($Root, "Corrigir ACL raiz")) {
        $rootAcl.SetAccessRuleProtection($true, $false)
        $rootAcl.Access | ForEach-Object { $rootAcl.RemoveAccessRule($_) | Out-Null }
        $rootAcl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'   'FullControl'))
        $rootAcl.AddAccessRule((New-ACE 'BUILTIN\Administrators' 'FullControl'))
        # Authenticated Users: so traversal na raiz, sem heranca para subpastas
        $rootAcl.AddAccessRule((New-ACE 'NT AUTHORITY\Authenticated Users' `
            'ReadAndExecute, Synchronize' 'Allow' 'None' 'None'))
        Set-Acl -LiteralPath $Root -AclObject $rootAcl
        Log "    [OK] Raiz corrigida" 'Green'
        $ok++
    }
} catch {
    Log "    [ERRO] Raiz: $($_.Exception.Message)" 'Red'
    $err++
}

# 2. Apagar Direcao (sem acento -- pasta duplicada a manter e Direcao com acento)
$deletePath = Join-Path $Root $deleteTarget
if (Test-Path -LiteralPath $deletePath) {
    $count = @(Get-ChildItem -LiteralPath $deletePath -Recurse -ErrorAction SilentlyContinue).Count
    if ($count -gt 0) {
        Log ""
        Log "[AVISO] '$deleteTarget' tem $count itens -- verifica o conteudo antes de apagar." 'Yellow'
        Log "        Remove-Item -LiteralPath '$deletePath' -Recurse -Force" 'Yellow'
        $skip++
    } else {
        if ($PSCmdlet.ShouldProcess($deletePath, "Apagar pasta vazia '$deleteTarget'")) {
            Remove-Item -LiteralPath $deletePath -Force
            Log "  [OK] Pasta '$deleteTarget' apagada (estava vazia)" 'Green'
            $ok++
        }
    }
} else {
    Log "[INFO] Pasta '$deleteTarget' nao existe -- nada a apagar" 'Gray'
}

# 3. Departamentos -- enumerar pastas reais e fazer match por nome normalizado
Log ""
Log "[DEPARTAMENTOS] A enumerar subpastas de $Root ..." 'Yellow'

$subFolders = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue

foreach ($folder in $subFolders) {
    $normName = Normalize $folder.Name
    $path     = $folder.FullName

    if (-not $folderMap.ContainsKey($normName)) {
        Log "  [SKIP] Sem mapeamento para: $($folder.Name)  (norm=$normName)" 'DarkYellow'
        $skip++
        continue
    }

    $config = $folderMap[$normName]

    if ($null -eq $config) {
        Log "  [SKIP] $($folder.Name) -- ja configurada (piloto)" 'Gray'
        $skip++
        continue
    }

    $rw = $config[0]
    $ro = $config[1]

    try {
        Set-FolderACL -Path $path -GroupRW $rw -GroupRO $ro -SafeKey $normName
        $rwLabel = if ($rw) { $rw -replace 'AINTAR\\','' } else { '(nenhum)' }
        $roLabel = if ($ro) { $ro -replace 'AINTAR\\','' } else { '(nenhum)' }
        Log "  [OK] $($folder.Name)  RW=$rwLabel  RO=$roLabel" 'Green'
        $ok++
    } catch {
        Log "  [ERRO] $($folder.Name): $($_.Exception.Message)" 'Red'
        $err++
    }
}

# 4. Resumo
Log ""
Log "=== Resumo ===" 'Cyan'
Log "  Processadas com sucesso:    $ok"
Log "  Saltadas (piloto/sem mapa): $skip"
Log "  Erros:                      $err" $(if ($err) {'Red'} else {'White'})
Log ""
Log "Para reverter:  .\16-Apply-FileAintar-ACLs.ps1 -Rollback"
Log "Backups em: $BackupDir"
Log "Log em: $log"
