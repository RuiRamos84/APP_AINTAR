<#
.SYNOPSIS
    Criar estrutura de pastas do FileServer e aplicar ACLs NTFS.
.DESCRIPTION
    Cria a arvore de pastas no FileServer conforme o organograma e aplica
    permissoes NTFS usando os grupos de seguranca configurados no script 6.
    Executar LOCALMENTE no FileServer (\\172.16.2.35), como Administrador.

    IMPORTANTE: Este script cria uma estrutura NOVA em paralelo.
    A migracao de dados faz-se depois com robocopy.
.PARAMETER RootPath
    Caminho raiz para a nova estrutura (default: D:\file_aintar)
.PARAMETER ShareName
    Nome da partilha SMB a criar (default: file_aintar)
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\9-Setup-FileServer.ps1 -WhatIf
    .\9-Setup-FileServer.ps1 -RootPath "E:\file_aintar"
#>


[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$RootPath  = 'D:\file_aintar',
    [string]$ShareName = 'file_aintar'
)

$ErrorActionPreference = 'Continue'

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Setup-FileServer_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Set-FolderACL {
    param(
        [string]$Path,
        [string]$GroupRW = '',
        [string]$GroupRO = '',
        [bool]$BreakInheritance = $true,
        [bool]$TraverseOnly = $false
    )

    if (-not (Test-Path $Path)) {
        Log "[AVISO] Pasta nao existe: $Path"
        return
    }

    $acl = Get-Acl -LiteralPath $Path

    if ($BreakInheritance) {
        # Quebrar heranca, copiar ACEs existentes
        $acl.SetAccessRuleProtection($true, $false)

        # Adicionar SYSTEM e Administrators com Full Control
        $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            'NT AUTHORITY\SYSTEM', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            'BUILTIN\Administrators', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($systemRule)
        $acl.AddAccessRule($adminRule)
    }

    if ($TraverseOnly) {
        # Pasta-contentor sem ficheiros proprios (ex: DAGF, DPAS, raiz): permitir
        # apenas atravessar/listar a propria pasta, sem aceder ao conteudo das
        # subpastas (que tem as suas proprias ACLs). Aplica-se so a esta pasta
        # ("None" em vez de "ContainerInherit,ObjectInherit") para nao propagar.
        $traverseRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            'NT AUTHORITY\Authenticated Users',
            [System.Security.AccessControl.FileSystemRights]'ListDirectory,ReadAttributes,Traverse',
            'None', 'None', 'Allow')
        $acl.AddAccessRule($traverseRule)
        Log "       [ACL] Authenticated Users = Traverse/List (sem acesso ao conteudo)"
    }

    # Grupo RW -- Modify (nao Full Control)
    if ($GroupRW) {
        $rwRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $GroupRW, 'Modify', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rwRule)
        Log "       [ACL] $GroupRW = Modify"
    }

    # Grupo RO -- ReadAndExecute
    if ($GroupRO) {
        $roRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $GroupRO, 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($roRule)
        Log "       [ACL] $GroupRO = Read"
    }

    if ($PSCmdlet.ShouldProcess($Path, "Aplicar ACL")) {
        Set-Acl -LiteralPath $Path -AclObject $acl
    }
}

Write-Host "=== Setup FileServer -- AINTAR ===" -ForegroundColor Cyan
Write-Host "    Raiz: $RootPath" -ForegroundColor Yellow
Write-Host ""

# ---------------------------------------------------------------
# 1. Criar estrutura de pastas
# ---------------------------------------------------------------
Write-Host "[1/3] A criar estrutura de pastas..." -ForegroundColor Yellow

$pastas = @(
    'Comum',
    'Scanner',
    'Direcao',
    'Juridico',
    'DAGF',
    'DAGF\_Geral',
    'DAGF\Contabilidade',
    'DAGF\RH',
    'DAGF\Atendimento',
    'DAGF\Frota-Logistica',
    'DAGF\Aprovisionamento',
    'DPAS',
    'DPAS\_Geral',
    'DPAS\Ambiente',
    'DPAS\Projetos',
    'DPAS\Operacao',
    'DPAS\Licenciamento',
    'TI',
    'Arquivo'
)

foreach ($p in $pastas) {
    $fullPath = Join-Path $RootPath $p
    if (Test-Path $fullPath) {
        Log "[OK]   Pasta ja existe: $p"
    } else {
        if ($PSCmdlet.ShouldProcess($fullPath, "Criar pasta")) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Log "[NOVO] Pasta criada: $p"
        }
    }
}

# ---------------------------------------------------------------
# 2. Aplicar ACLs NTFS
# ---------------------------------------------------------------
Write-Host "[2/3] A aplicar permissoes NTFS..." -ForegroundColor Yellow

$domain = $env:USERDOMAIN

$aclMap = @(
    @{ Pasta = 'Comum';                 RW = "SG_FS_COMUM_RW";            RO = '' },
    @{ Pasta = 'Scanner';               RW = "SG_FS_SCANNER_RW";          RO = '' },
    @{ Pasta = 'Direcao';               RW = "SG_FS_DIR_RW";              RO = "SG_FS_DIR_RO" },
    @{ Pasta = 'Juridico';              RW = "SG_FS_JURIDICO_RW";         RO = "SG_FS_JURIDICO_RO" },
    @{ Pasta = 'DAGF\_Geral';           RW = "SG_FS_DAGF_RW";             RO = "SG_FS_DAGF_RO" },
    @{ Pasta = 'DAGF\Contabilidade';    RW = "SG_FS_CONTABILIDADE_RW";    RO = "SG_FS_CONTABILIDADE_RO" },
    @{ Pasta = 'DAGF\RH';              RW = "SG_FS_RH_RW";               RO = "SG_FS_RH_RO" },
    @{ Pasta = 'DAGF\Atendimento';      RW = "SG_FS_ATENDIMENTO_RW";      RO = "SG_FS_ATENDIMENTO_RO" },
    @{ Pasta = 'DAGF\Frota-Logistica';  RW = "SG_FS_FROTA_RW";            RO = "SG_FS_FROTA_RO" },
    @{ Pasta = 'DAGF\Aprovisionamento'; RW = "SG_FS_APROVISIONAMENTO_RW"; RO = "SG_FS_APROVISIONAMENTO_RO" },
    @{ Pasta = 'DPAS\_Geral';           RW = "SG_FS_DPAS_RW";             RO = "SG_FS_DPAS_RO" },
    @{ Pasta = 'DPAS\Ambiente';         RW = "SG_FS_AMBIENTE_RW";         RO = "SG_FS_AMBIENTE_RO" },
    @{ Pasta = 'DPAS\Projetos';         RW = "SG_FS_PROJ_RW";             RO = "SG_FS_PROJ_RO" },
    @{ Pasta = 'DPAS\Operacao';         RW = "SG_FS_OPERACAO_RW";         RO = "SG_FS_OPERACAO_RO" },
    @{ Pasta = 'DPAS\Licenciamento';    RW = "SG_FS_LICENCIAMENTO_RW";    RO = "SG_FS_LICENCIAMENTO_RO" },
    @{ Pasta = 'TI';                    RW = "SG_FS_TI_RW";               RO = '' }
)

foreach ($item in $aclMap) {
    $fullPath = Join-Path $RootPath $item.Pasta
    Log "[ACL]  $($item.Pasta)"

    $rwGroup = if ($item.RW) { "$domain\$($item.RW)" } else { '' }
    $roGroup = if ($item.RO) { "$domain\$($item.RO)" } else { '' }

    Set-FolderACL -Path $fullPath -GroupRW $rwGroup -GroupRO $roGroup -BreakInheritance $true
}

# Pastas-contentor (sem ficheiros proprios, so subpastas com ACL dedicada):
# raiz, DAGF e DPAS. Quebrar heranca e permitir apenas atravessar/listar,
# sem dar acesso ao conteudo -- evita herdar permissoes amplas do D:\.
$contentores = @('', 'DAGF', 'DPAS')
foreach ($c in $contentores) {
    $fullPath = if ($c) { Join-Path $RootPath $c } else { $RootPath }
    Log "[ACL]  $(if ($c) { $c } else { '(raiz)' }) (contentor -- traverse only)"
    Set-FolderACL -Path $fullPath -BreakInheritance $true -TraverseOnly $true
}

# Arquivo -- read-only para todos
$arquivoPath = Join-Path $RootPath 'Arquivo'
Log "[ACL]  Arquivo (read-only)"
$aclArquivo = Get-Acl -LiteralPath $arquivoPath
$aclArquivo.SetAccessRuleProtection($true, $false)
$aclArquivo.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    'NT AUTHORITY\SYSTEM', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
$aclArquivo.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    'BUILTIN\Administrators', 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
$aclArquivo.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    "$domain\SG_FS_COMUM_RW", 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow')))
if ($PSCmdlet.ShouldProcess($arquivoPath, "Aplicar ACL read-only")) {
    Set-Acl -LiteralPath $arquivoPath -AclObject $aclArquivo
}

# ---------------------------------------------------------------
# 3. Criar/atualizar partilha SMB
# ---------------------------------------------------------------
Write-Host "[3/3] A configurar partilha SMB..." -ForegroundColor Yellow

$existingShare = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if ($existingShare) {
    Log "[OK]   Partilha '$ShareName' ja existe em $($existingShare.Path)"
} else {
    if ($PSCmdlet.ShouldProcess("$ShareName ($RootPath)", "Criar partilha SMB")) {
        New-SmbShare -Name $ShareName -Path $RootPath `
            -FullAccess 'Authenticated Users' `
            -Description 'FileServer AINTAR -- estrutura organizada' `
            -FolderEnumerationMode AccessBased
        Log "[NOVO] Partilha '$ShareName' criada com ABE (Access Based Enumeration)"
    }
}

Write-Host ""
Write-Host "=== Proximos passos ===" -ForegroundColor Yellow
Write-Host "1. Validar a estrutura: dir $RootPath /s" -ForegroundColor Gray
Write-Host "2. Testar acesso com 1-2 utilizadores piloto" -ForegroundColor Gray
Write-Host "3. Migrar dados com robocopy (exemplo por departamento):" -ForegroundColor Gray
Write-Host ""
Write-Host "   robocopy `"\\172.16.2.35\shared\Contabilidade`" `"$RootPath\DAGF\Contabilidade`" /MIR /SEC /DCOPY:T /R:1 /W:1 /LOG:robocopy_contabilidade.log" -ForegroundColor DarkGray
Write-Host ""
Write-Host "4. Remapear drives via GPO (Group Policy Preferences)" -ForegroundColor Gray
Write-Host "5. Partilha antiga fica read-only 30 dias, depois arquivo" -ForegroundColor Gray
Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
