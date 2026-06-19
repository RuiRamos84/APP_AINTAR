<#
.SYNOPSIS
    Move pastas de Temporario\Scanner para Scanner\ e aplica ACLs por utilizador.
.DESCRIPTION
    Executar NO FILESERVER (172.16.2.35), como Administrador.
    1. Move Temporario\Scanner\[Nome] -> Scanner\[Nome]
    2. Raiz Scanner\: traversal para SG_FS_SCANNER_RW (sem heranca para subpastas)
    3. Cada subpasta: heranca quebrada, so SYSTEM + Administrators + utilizador proprio (Modify)
    Match pasta -> conta AD feito por DisplayName normalizado.
    Usar -WhatIf para simular sem alterar nada.
.EXAMPLE
    .\21-Reorganize-Scanner.ps1 -WhatIf
    .\21-Reorganize-Scanner.ps1
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$FileAintarRoot = 'D:\FILE_AINTAR'
)

$ErrorActionPreference = 'Continue'
$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log    = Join-Path $ReportDir "Reorganize-Scanner_$stamp.log"
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
# Caminhos
# ---------------------------------------------------------------
$scannerRoot = $null
Get-ChildItem -LiteralPath $FileAintarRoot -Directory | ForEach-Object {
    if ((Normalize $_.Name) -eq 'SCANNER') { $scannerRoot = $_.FullName }
}
$tempScanner = $null
Get-ChildItem -LiteralPath $FileAintarRoot -Directory | ForEach-Object {
    if ((Normalize $_.Name) -eq 'TEMPORARIO') {
        Get-ChildItem -LiteralPath $_.FullName -Directory | ForEach-Object {
            if ((Normalize $_.Name) -eq 'SCANNER') { $tempScanner = $_.FullName }
        }
    }
}

Log "=== Reorganizar Scanner -- $stamp ===" 'Cyan'
if ($whatif) { Log "    MODO SIMULACAO (-WhatIf)" 'Yellow' }
Log "  Scanner raiz:    $scannerRoot"
Log "  Temporario\Scanner: $tempScanner"

if (-not $scannerRoot) { Log "[ERRO] Pasta Scanner nao encontrada em $FileAintarRoot" 'Red'; exit 1 }
if (-not $tempScanner) { Log "[AVISO] Temporario\Scanner nao encontrada -- nada a mover" 'Yellow' }

# ---------------------------------------------------------------
# Construir lookup: Normalize(DisplayName) -> sAMAccountName
# a partir dos membros de SG_FS_SCANNER_RW
# ---------------------------------------------------------------
Log ""
Log "[AD] A carregar membros de SG_FS_SCANNER_RW..." 'Yellow'

$adLookup = @{}   # Normalize(DisplayName) -> sAMAccountName

try {
    $searcher = New-Object System.DirectoryServices.DirectorySearcher
    $searcher.SearchRoot = [ADSI]"LDAP://AINTAR.LOCAL"
    $searcher.Filter = "(&(objectClass=group)(sAMAccountName=SG_FS_SCANNER_RW))"
    $searcher.PropertiesToLoad.Add("member") | Out-Null
    $groupResult = $searcher.FindOne()

    if ($groupResult -and $groupResult.Properties["member"]) {
        foreach ($memberDN in $groupResult.Properties["member"]) {
            $uSearcher = New-Object System.DirectoryServices.DirectorySearcher
            $uSearcher.SearchRoot = [ADSI]"LDAP://AINTAR.LOCAL"
            $uSearcher.Filter = "(&(objectClass=user)(distinguishedName=$memberDN))"
            $uSearcher.PropertiesToLoad.AddRange([string[]]@('sAMAccountName', 'displayName', 'cn')) | Out-Null
            $uResult = $uSearcher.FindOne()
            if ($uResult) {
                $sam  = [string]$uResult.Properties["sAMAccountName"][0]
                $disp = if ($uResult.Properties["displayName"].Count -gt 0) { [string]$uResult.Properties["displayName"][0] } else { [string]$uResult.Properties["cn"][0] }
                $normDisp = Normalize $disp
                $adLookup[$normDisp] = $sam
                Log "    $disp  ->  $sam" 'Gray'
            }
        }
    }
} catch {
    Log "[ERRO] Falha ao consultar AD: $($_.Exception.Message)" 'Red'
    Log "       As ACLs por utilizador serao saltadas -- pastas movidas sem ACL personalizada." 'Yellow'
}

Log "    Total de membros carregados: $($adLookup.Count)" 'Cyan'

# ---------------------------------------------------------------
# Overrides manuais: nome da pasta (normalizado) -> sAMAccountName
# Usar quando o nome da pasta nao coincide com o DisplayName AD
# ---------------------------------------------------------------
$manualOverrides = @{
    'MIGUEL SOUSA' = 'nunosousa'   # pasta "Miguel Sousa" = conta AD "Nuno Sousa" (nunosousa)
}

# ---------------------------------------------------------------
# Helper: encontrar sAMAccountName a partir do nome da pasta
# Tenta: 1) override manual  2) match exato normalizado  3) prefixo
# ---------------------------------------------------------------
function Find-SamAccount([string]$folderName) {
    $normFolder = Normalize $folderName

    # 1. Override manual
    if ($manualOverrides.ContainsKey($normFolder)) { return $manualOverrides[$normFolder] }

    # 2. Exato
    if ($adLookup.ContainsKey($normFolder)) { return $adLookup[$normFolder] }

    # 3. displayName e prefixo do nome da pasta  (ex: "ANA RITA" dentro de "ANA RITA LARANJEIRA")
    foreach ($key in $adLookup.Keys) {
        if ($normFolder.StartsWith($key)) { return $adLookup[$key] }
    }

    # 4. Nome da pasta e prefixo do displayName  (ex: "RUI" corresponde a "RUI RAMOS")
    foreach ($key in $adLookup.Keys) {
        if ($key.StartsWith($normFolder)) { return $adLookup[$key] }
    }

    return $null
}

# ---------------------------------------------------------------
# 1. Mover pastas de Temporario\Scanner -> Scanner\
# ---------------------------------------------------------------
$ok   = 0
$skip = 0
$errs = 0

if ($tempScanner -and (Test-Path -LiteralPath $tempScanner)) {
    Log ""
    Log "[MOVER] Temporario\Scanner -> Scanner\" 'Yellow'

    $userFolders = Get-ChildItem -LiteralPath $tempScanner -Directory -ErrorAction SilentlyContinue

    foreach ($folder in $userFolders) {
        $dst = Join-Path $scannerRoot $folder.Name
        if (Test-Path -LiteralPath $dst) {
            Log "  [SKIP] Ja existe no destino: $($folder.Name)" 'DarkYellow'
            $skip++
            continue
        }
        Log "  $($folder.Name)  ->  $dst" 'Cyan'
        if (-not $whatif) {
            try {
                Move-Item -LiteralPath $folder.FullName -Destination $dst -ErrorAction Stop
                Log "    [OK] Movido" 'Green'
                $ok++
            } catch {
                Log "    [ERRO] $($_.Exception.Message)" 'Red'
                $errs++
            }
        } else {
            Log "    [WHATIF] Move-Item '$($folder.FullName)' -> '$dst'" 'DarkYellow'
            $ok++
        }
    }

    # Apagar Temporario\Scanner se ficou vazia
    if (-not $whatif) {
        $remaining = Get-ChildItem -LiteralPath $tempScanner -ErrorAction SilentlyContinue
        if (-not $remaining) {
            try {
                Remove-Item -LiteralPath $tempScanner -Force -ErrorAction Stop
                Log "  [OK] Temporario\Scanner apagada (ficou vazia)" 'Green'
            } catch {
                Log "  [AVISO] Nao foi possivel apagar Temporario\Scanner: $($_.Exception.Message)" 'Yellow'
            }
        } else {
            Log "  [AVISO] Temporario\Scanner ainda tem $(@($remaining).Count) items -- verificar manualmente" 'Yellow'
        }
    }
} else {
    Log "  [SKIP] Temporario\Scanner nao existe ou ja foi movida" 'Gray'
}

# ---------------------------------------------------------------
# 2. ACL da raiz Scanner\
#    SYSTEM + Administrators: FullControl (heranca total)
#    SG_FS_SCANNER_RW: ReadAndExecute nesta pasta APENAS (sem heranca)
#    -> permite listar a raiz e entrar na propria subpasta
# ---------------------------------------------------------------
Log ""
Log "[ACL-RAIZ] Scanner\ -- traversal para SG_FS_SCANNER_RW (sem heranca)" 'Yellow'

if (-not $whatif) {
    try {
        $acl = Get-Acl -LiteralPath $scannerRoot
        $acl.SetAccessRuleProtection($true, $false)
        $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

        $acl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'      'FullControl'))
        $acl.AddAccessRule((New-ACE 'BUILTIN\Administrators'   'FullControl'))
        # SG_FS_SCANNER_RW: apenas nesta pasta, sem propagacao -- permite ListDirectory + Traverse
        $acl.AddAccessRule((New-ACE 'AINTAR\SG_FS_SCANNER_RW' 'ReadAndExecute, Synchronize' 'Allow' 'None' 'None'))

        Set-Acl -LiteralPath $scannerRoot -AclObject $acl -ErrorAction Stop
        Log "  [OK] ACL raiz Scanner\ configurada" 'Green'
    } catch {
        Log "  [ERRO] ACL raiz: $($_.Exception.Message)" 'Red'
        $errs++
    }
} else {
    Log "  [WHATIF] Configuraria ACL raiz: SYSTEM=FullControl, Admins=FullControl, SG_FS_SCANNER_RW=ReadAndExecute(ThisFolderOnly)" 'DarkYellow'
}

# ---------------------------------------------------------------
# 3. ACL por subpasta em Scanner\
#    Quebrar heranca, aplicar:
#    - SYSTEM:         FullControl (ContainerInherit,ObjectInherit)
#    - Administrators: FullControl (ContainerInherit,ObjectInherit)
#    - [utilizador]:   Modify      (ContainerInherit,ObjectInherit)
# ---------------------------------------------------------------
Log ""
Log "[ACL-SUBPASTAS] Permissoes individuais por utilizador..." 'Yellow'

$subFolders = Get-ChildItem -LiteralPath $scannerRoot -Directory -ErrorAction SilentlyContinue

foreach ($folder in $subFolders) {
    $sam = Find-SamAccount $folder.Name

    if (-not $sam) {
        Log "  [AVISO] $($folder.Name) -- nao foi encontrada conta AD correspondente, ACL nao configurada" 'Yellow'
        $skip++
        continue
    }

    $userIdentity = "AINTAR\$sam"
    Log "  $($folder.Name)  ->  $userIdentity" 'Cyan'

    if (-not $whatif) {
        try {
            $acl = Get-Acl -LiteralPath $folder.FullName
            $acl.SetAccessRuleProtection($true, $false)
            $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

            $acl.AddAccessRule((New-ACE 'NT AUTHORITY\SYSTEM'   'FullControl'))
            $acl.AddAccessRule((New-ACE 'BUILTIN\Administrators' 'FullControl'))
            $acl.AddAccessRule((New-ACE $userIdentity           'Modify, Synchronize'))

            Set-Acl -LiteralPath $folder.FullName -AclObject $acl -ErrorAction Stop
            Log "    [OK] ACL configurada -- so $sam tem acesso" 'Green'
            $ok++
        } catch {
            Log "    [ERRO] $($_.Exception.Message)" 'Red'
            $errs++
        }
    } else {
        Log "    [WHATIF] Set-Acl: SYSTEM=FullControl, Admins=FullControl, $userIdentity=Modify" 'DarkYellow'
        $ok++
    }
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

if (-not $whatif) {
    Log "Estrutura final Scanner\:" 'Cyan'
    Get-ChildItem -LiteralPath $scannerRoot -Directory | Sort-Object Name | ForEach-Object {
        $acl = Get-Acl -LiteralPath $_.FullName
        $userAce = $acl.Access | Where-Object {
            $_.IdentityReference -notlike '*SYSTEM*' -and
            $_.IdentityReference -notlike '*Administrators*'
        } | Select-Object -First 1
        $userLabel = if ($userAce) { $userAce.IdentityReference.Value } else { '(sem utilizador)' }
        Log "  $($_.Name)  ->  $userLabel" 'Gray'
    }
}
Log ""
Log "NOTA: Utilizadores precisam de logoff/logon para tokens Kerberos atualizarem." 'Yellow'
Log "NOTA: UNC de acesso ao scanner proprio: \\172.16.2.35\file_aintar\Scanner\[Nome]" 'Yellow'
