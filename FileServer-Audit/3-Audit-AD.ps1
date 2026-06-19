<#
.SYNOPSIS
    Auditoria do Active Directory -- OUs, grupos, utilizadores e higiene de contas.
.DESCRIPTION
    Executar num Domain Controller ou em maquina com RSAT (modulo ActiveDirectory).
    Apenas LEITURA -- nao altera nada.
    Gera CSVs na pasta .\Reports\ :
      - AD-OUs.csv             : estrutura de OUs e nr de objetos em cada uma
      - AD-Grupos.csv          : grupos (escopo, categoria, nr de membros, descricao)
      - AD-GruposMembros.csv   : membership completo (grupo -> membro)
      - AD-Utilizadores.csv    : utilizadores com flags de higiene
      - AD-Problemas.csv       : red flags consolidadas
.PARAMETER DiasInativo
    Contas sem logon ha mais de N dias contam como inativas (default: 90)
.EXAMPLE
    .\3-Audit-AD.ps1 -DiasInativo 90
#>


#Requires -Modules ActiveDirectory

[CmdletBinding()]
param(
    [int]$DiasInativo = 90
)

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$cutoff = (Get-Date).AddDays(-$DiasInativo)

$dominio = (Get-ADDomain).DNSRoot
Write-Host "=== Auditoria AD -- $dominio -- $stamp ===" -ForegroundColor Cyan

$problemas = [System.Collections.Generic.List[object]]::new()

# ---------------------------------------------------------------
# 1. Estrutura de OUs
# ---------------------------------------------------------------
Write-Host "[1/4] OUs..." -ForegroundColor Yellow
$ous = Get-ADOrganizationalUnit -Filter * -Properties Description | ForEach-Object {
    $dn = $_.DistinguishedName
    [PSCustomObject]@{
        OU           = $_.Name
        DN           = $dn
        Descricao    = $_.Description
        Utilizadores = @(Get-ADUser     -SearchBase $dn -SearchScope OneLevel -Filter *).Count
        Computadores = @(Get-ADComputer -SearchBase $dn -SearchScope OneLevel -Filter *).Count
        Grupos       = @(Get-ADGroup    -SearchBase $dn -SearchScope OneLevel -Filter *).Count
    }
}
$ous | Export-Csv -Path (Join-Path $ReportDir "AD-OUs_$stamp.csv") -NoTypeInformation -Encoding UTF8

# Objetos fora de OUs (nos contentores default = sinal de AD desorganizado)
$defaultUsers = @(Get-ADUser -SearchBase ("CN=Users," + (Get-ADDomain).DistinguishedName) -SearchScope OneLevel -Filter * |
    Where-Object { $_.SamAccountName -notin @('Administrator', 'Guest', 'krbtgt') })
$defaultComputers = @(Get-ADComputer -SearchBase ("CN=Computers," + (Get-ADDomain).DistinguishedName) -SearchScope OneLevel -Filter *)

if ($defaultUsers.Count -gt 0) {
    $problemas.Add([PSCustomObject]@{
        Categoria = 'ESTRUTURA'; Objeto = 'CN=Users'
        Problema  = "$($defaultUsers.Count) utilizadores no contentor default em vez de OUs: $($defaultUsers.SamAccountName -join ', ')"
    })
}
if ($defaultComputers.Count -gt 0) {
    $problemas.Add([PSCustomObject]@{
        Categoria = 'ESTRUTURA'; Objeto = 'CN=Computers'
        Problema  = "$($defaultComputers.Count) computadores no contentor default em vez de OUs"
    })
}

# ---------------------------------------------------------------
# 2. Grupos e memberships
# ---------------------------------------------------------------
Write-Host "[2/4] Grupos..." -ForegroundColor Yellow
$grupos = Get-ADGroup -Filter * -Properties Description, Members, whenCreated

$grupoRows = $grupos | ForEach-Object {
    [PSCustomObject]@{
        Grupo     = $_.Name
        Escopo    = $_.GroupScope
        Categoria = $_.GroupCategory
        Membros   = @($_.Members).Count
        Descricao = $_.Description
        Criado    = $_.whenCreated
        DN        = $_.DistinguishedName
    }
}
$grupoRows | Export-Csv -Path (Join-Path $ReportDir "AD-Grupos_$stamp.csv") -NoTypeInformation -Encoding UTF8

$membroRows = foreach ($g in $grupos) {
    $membros = Get-ADGroupMember -Identity $g.DistinguishedName -ErrorAction SilentlyContinue
    foreach ($m in $membros) {
        [PSCustomObject]@{
            Grupo      = $g.Name
            Membro     = $m.SamAccountName
            TipoMembro = $m.objectClass
        }
    }
}
$membroRows | Export-Csv -Path (Join-Path $ReportDir "AD-GruposMembros_$stamp.csv") -NoTypeInformation -Encoding UTF8

# Grupos vazios criados ha > 6 meses (excluir built-in)
$builtinGroupsDN = '^CN=[^,]+,CN=(Builtin|Users),'
$grupos | Where-Object {
    @($_.Members).Count -eq 0 -and
    $_.whenCreated -lt (Get-Date).AddMonths(-6) -and
    $_.DistinguishedName -notmatch $builtinGroupsDN
} | ForEach-Object {
    $problemas.Add([PSCustomObject]@{
        Categoria = 'GRUPO'; Objeto = $_.Name
        Problema  = "Grupo vazio criado em $($_.whenCreated.ToString('yyyy-MM-dd')) -- candidato a remocao"
    })
}

# Membros de grupos privilegiados
foreach ($pg in @('Domain Admins', 'Enterprise Admins', 'Schema Admins', 'Administrators')) {
    $membros = @(Get-ADGroupMember -Identity $pg -ErrorAction SilentlyContinue)
    if ($membros.Count -gt 0) {
        $problemas.Add([PSCustomObject]@{
            Categoria = 'PRIVILEGIOS'; Objeto = $pg
            Problema  = "Rever membros ($($membros.Count)): $($membros.SamAccountName -join ', ')"
        })
    }
}

# ---------------------------------------------------------------
# 3. Utilizadores -- higiene de contas
# ---------------------------------------------------------------
Write-Host "[3/4] Utilizadores..." -ForegroundColor Yellow
$users = Get-ADUser -Filter * -Properties LastLogonDate, PasswordLastSet, PasswordNeverExpires, `
    Enabled, Description, whenCreated, MemberOf

$userRows = $users | ForEach-Object {
    $inativo = ($_.Enabled -and $_.LastLogonDate -and $_.LastLogonDate -lt $cutoff)
    $nuncaLogou = ($_.Enabled -and -not $_.LastLogonDate -and $_.whenCreated -lt $cutoff)

    if ($inativo) {
        $problemas.Add([PSCustomObject]@{
            Categoria = 'CONTA'; Objeto = $_.SamAccountName
            Problema  = "Ativa mas sem logon desde $($_.LastLogonDate.ToString('yyyy-MM-dd')) -- desativar?"
        })
    }
    if ($nuncaLogou) {
        $problemas.Add([PSCustomObject]@{
            Categoria = 'CONTA'; Objeto = $_.SamAccountName
            Problema  = 'Ativa mas nunca fez logon -- conta fantasma?'
        })
    }
    if ($_.PasswordNeverExpires -and $_.Enabled -and $_.SamAccountName -notmatch '^(svc|sa)[-_.]') {
        $problemas.Add([PSCustomObject]@{
            Categoria = 'PASSWORD'; Objeto = $_.SamAccountName
            Problema  = 'Password nunca expira (e nao parece conta de servico)'
        })
    }

    [PSCustomObject]@{
        Conta             = $_.SamAccountName
        Nome              = $_.Name
        Ativa             = $_.Enabled
        UltimoLogon       = $_.LastLogonDate
        PasswordAlterada  = $_.PasswordLastSet
        PasswordNaoExpira = $_.PasswordNeverExpires
        Criada            = $_.whenCreated
        NumGrupos         = @($_.MemberOf).Count
        OU                = ($_.DistinguishedName -split ',', 2)[1]
    }
}
$userRows | Export-Csv -Path (Join-Path $ReportDir "AD-Utilizadores_$stamp.csv") -NoTypeInformation -Encoding UTF8

# ---------------------------------------------------------------
# 4. Exportar problemas + resumo
# ---------------------------------------------------------------
Write-Host "[4/4] Resumo:" -ForegroundColor Yellow
$problemas | Export-Csv -Path (Join-Path $ReportDir "AD-Problemas_$stamp.csv") -NoTypeInformation -Encoding UTF8

Write-Host ("    OUs:           {0}" -f @($ous).Count)
Write-Host ("    Grupos:        {0}" -f @($grupos).Count)
Write-Host ("    Utilizadores:  {0} ({1} ativos)" -f @($users).Count, @($users | Where-Object Enabled).Count)
Write-Host ("    Problemas:     {0}" -f $problemas.Count) -ForegroundColor $(if ($problemas.Count) {'Red'} else {'Green'})

$problemas | Group-Object Categoria | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("      {0,-12} {1}" -f $_.Name, $_.Count)
}

Write-Host "`nRelatorios em: $ReportDir" -ForegroundColor Cyan
