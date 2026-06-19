<#
.SYNOPSIS
    Piloto de permissoes em D:\FILE_AINTAR\DAGF.
.DESCRIPTION
    Executar NO FILESERVER (\\172.16.2.35), como Administrador.
    Faz backup da ACL atual, quebra heranca, remove Authenticated Users,
    aplica SG_FS_DAGF_RW (Modify) e SG_FS_DAGF_RO (ReadAndExecute).
    Usar -WhatIf para simular. Usar -Rollback para restaurar.
.PARAMETER TargetPath
    Pasta alvo (default: D:\FILE_AINTAR\DAGF)
.PARAMETER WhatIf
    Simula sem alterar nada.
.PARAMETER Rollback
    Restaura a ACL a partir do backup guardado.
.EXAMPLE
    .\15-Pilot-DAGF.ps1 -WhatIf
    .\15-Pilot-DAGF.ps1
    .\15-Pilot-DAGF.ps1 -Rollback
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$TargetPath = 'D:\FILE_AINTAR\DAGF',
    [switch]$Rollback
)

$ErrorActionPreference = 'Stop'

$ReportDir  = Join-Path $PSScriptRoot 'Reports'
$BackupFile = Join-Path $ReportDir 'Backup-ACL-DAGF.txt'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
}

# ---------------------------------------------------------------
# ROLLBACK
# ---------------------------------------------------------------
if ($Rollback) {
    if (-not (Test-Path $BackupFile)) {
        Write-Error "Backup nao encontrado: $BackupFile. Nao e possivel fazer rollback."
        exit 1
    }
    Log "=== ROLLBACK -- $TargetPath ==="
    if ($PSCmdlet.ShouldProcess($TargetPath, "Restaurar ACL a partir de $BackupFile")) {
        $sddl = Get-Content $BackupFile -Raw
        $acl  = Get-Acl -LiteralPath $TargetPath
        $acl.SetSecurityDescriptorSddlForm($sddl)
        Set-Acl -LiteralPath $TargetPath -AclObject $acl
        Log "[OK] ACL restaurada com sucesso."
    }
    exit 0
}

# ---------------------------------------------------------------
# PILOTO
# ---------------------------------------------------------------
Log "=== Piloto FILE_AINTAR\DAGF -- $stamp ==="
Log "Alvo: $TargetPath"

if (-not (Test-Path -LiteralPath $TargetPath)) {
    Write-Error "Pasta nao encontrada: $TargetPath"
    exit 1
}

# 1. Backup da ACL atual
$currentAcl = Get-Acl -LiteralPath $TargetPath
$sddl = $currentAcl.GetSecurityDescriptorSddlForm('All')

Log "[1/4] Backup da ACL atual..."
if ($PSCmdlet.ShouldProcess($BackupFile, "Guardar backup SDDL")) {
    Set-Content -Path $BackupFile -Value $sddl -Encoding UTF8
    Log "    -> Backup guardado em: $BackupFile"
}

Log "[2/4] ACL atual da pasta:"
$currentAcl.Access | ForEach-Object {
    Log ("    {0,-45} {1,-35} {2}" -f $_.IdentityReference, $_.FileSystemRights, $(if($_.IsInherited){'(herdada)'}else{'(direta)'}))
}

# 2. Quebrar heranca (copia ACEs existentes para ACEs explícitas, depois remove as herdadas)
Log "[3/4] A aplicar nova ACL..."

if ($PSCmdlet.ShouldProcess($TargetPath, "Quebrar heranca e aplicar grupos SG_FS_DAGF_*")) {

    $newAcl = Get-Acl -LiteralPath $TargetPath

    # Quebrar heranca: True = remover ACEs herdadas (começamos do zero com base em copia)
    $newAcl.SetAccessRuleProtection($true, $false)   # isProtected=true, preserveInheritance=false

    # Limpar todas as ACEs (vamos reconstruir do zero)
    $newAcl.Access | ForEach-Object { $newAcl.RemoveAccessRule($_) | Out-Null }

    # Helper para criar ACE
    function New-ACE([string]$identity, [string]$rights, [string]$type = 'Allow') {
        $ir   = [System.Security.Principal.NTAccount]$identity
        $fs   = [System.Security.AccessControl.FileSystemRights]$rights
        $it   = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
        $pt   = [System.Security.AccessControl.PropagationFlags]'None'
        $at   = [System.Security.AccessControl.AccessControlType]$type
        return New-Object System.Security.AccessControl.FileSystemAccessRule($ir, $fs, $it, $pt, $at)
    }

    # ACEs de sistema (obrigatorias)
    $newAcl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'    'FullControl'))
    $newAcl.AddAccessRule((New-ACE 'BUILTIN\Administrators'  'FullControl'))

    # Grupos de departamento
    $newAcl.AddAccessRule((New-ACE 'AINTAR\SG_FS_DAGF_RW'   'Modify, Synchronize'))
    $newAcl.AddAccessRule((New-ACE 'AINTAR\SG_FS_DAGF_RO'   'ReadAndExecute, Synchronize'))

    Set-Acl -LiteralPath $TargetPath -AclObject $newAcl
    Log "    -> ACL aplicada com sucesso."
}

# 3. Verificacao
Log "[4/4] Nova ACL aplicada:"
$verAcl = Get-Acl -LiteralPath $TargetPath
$verAcl.Access | ForEach-Object {
    Log ("    {0,-45} {1,-35} {2}" -f $_.IdentityReference, $_.FileSystemRights, $(if($_.IsInherited){'(herdada)'}else{'(direta)'}))
}

Log ""
Log "=== Piloto concluido ==="
Log "Para reverter:  .\15-Pilot-DAGF.ps1 -Rollback"
Log ""
Log "Teste com utilizadores:"
Log "  josemelo     -> deve ter acesso RW  (membro de SG_FS_DAGF_RW)"
Log "  pedrodinis   -> deve ter acesso NEGADO (nao e membro)"
Log "  ricardosousa -> deve ter acesso RO  (membro de SG_FS_DAGF_RO)"
