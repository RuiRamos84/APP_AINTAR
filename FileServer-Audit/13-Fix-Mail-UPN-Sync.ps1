<#
.SYNOPSIS
    Alinhar UPN/mail/proxyAddresses no AD com as contas cloud (M365/Entra ID)
    ja existentes, para o Entra Connect conseguir fazer "soft-match" sem criar
    duplicados.
.DESCRIPTION
    Pre-requisito para o Microsoft Entra Connect (fase 2, depois do script 12):

      1. Corrige 3 UPNs que nao correspondem ao UPN da conta cloud existente
         (mesma pessoa, nomes diferentes):
           - anarita        -> ritalaranjeira@aintar.pt   (Ana Rita)
           - vaniatrovao    -> vaniaribeiro@aintar.pt     (Vania Trovao / Ribeiro)
           - luispedro      -> luispedronunes@aintar.pt   (Luis Pedro Nunes)

      2. Para todos os 21 utilizadores em OU=Utilizadores,OU=Aintar (exceto
         contas de servico), define:
           - mail            = UserPrincipalName (apos correcao acima)
           - proxyAddresses  = SMTP:<mail>  (primario)

    Isto garante que o Entra Connect encontra, para cada objeto AD, o mesmo
    UPN/email da conta cloud correspondente -> soft-match, sem duplicar.

    Executar num DC ou maquina com RSAT, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\13-Fix-Mail-UPN-Sync.ps1 -WhatIf
    .\13-Fix-Mail-UPN-Sync.ps1
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$NovoSuffixo = 'aintar.pt'
)

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Fix-Mail-UPN-Sync_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

$domainDN = (Get-ADDomain).DistinguishedName
$searchBase = "OU=Utilizadores,OU=Aintar,$domainDN"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Alinhar UPN/mail/proxyAddresses com contas cloud -- AINTAR ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# 1. Corrigir UPNs que nao correspondem a conta cloud existente
# ---------------------------------------------------------------
Write-Host "[1/2] A corrigir UPNs para corresponder a conta cloud..." -ForegroundColor Yellow

$correcoesUpn = @{
    'anarita'     = "ritalaranjeira@$NovoSuffixo"
    'vaniatrovao' = "vaniaribeiro@$NovoSuffixo"
    'luispedro'   = "luispedronunes@$NovoSuffixo"
}

foreach ($conta in $correcoesUpn.Keys) {
    $novoUpn = $correcoesUpn[$conta]
    try {
        $user = Get-ADUser -Identity $conta -Properties UserPrincipalName
        if ($user.UserPrincipalName -eq $novoUpn) {
            Log "[OK]   '$conta' ja tem UPN correto: $novoUpn"
            continue
        }
        if ($PSCmdlet.ShouldProcess($conta, "Alterar UPN de '$($user.UserPrincipalName)' para '$novoUpn'")) {
            Set-ADUser -Identity $conta -UserPrincipalName $novoUpn
            Log "[DONE] '$conta': '$($user.UserPrincipalName)' -> '$novoUpn'"
        }
    } catch {
        Log "[ERRO] '$conta': $($_.Exception.Message)"
    }
}

# ---------------------------------------------------------------
# 2. Definir mail e proxyAddresses = UPN para todos os utilizadores
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[2/2] A definir mail/proxyAddresses..." -ForegroundColor Yellow

$contasServico = @('fortinet', 'ADSync', 'ScannerRicoh')

$utilizadores = Get-ADUser -Filter * -SearchBase $searchBase -Properties UserPrincipalName, mail, proxyAddresses |
    Where-Object { $_.SamAccountName -notin $contasServico }

$atualizados = 0
$jaOk = 0

foreach ($user in $utilizadores) {
    # Reler UPN (pode ter sido corrigido no passo 1)
    $upn = (Get-ADUser -Identity $user.SamAccountName -Properties UserPrincipalName).UserPrincipalName

    if (-not $upn -or $upn -notlike "*@$NovoSuffixo") {
        Log "[AVISO] '$($user.SamAccountName)': UPN '$upn' nao e @$NovoSuffixo -- a ignorar"
        continue
    }

    $proxyDesejado = "SMTP:$upn"
    $precisaMail   = ($user.mail -ne $upn)
    $proxyAtual    = @($user.proxyAddresses)
    $precisaProxy  = -not ($proxyAtual -contains $proxyDesejado)

    if (-not $precisaMail -and -not $precisaProxy) {
        Log "[OK]   '$($user.SamAccountName)' ja tem mail/proxyAddresses corretos ($upn)"
        $jaOk++
        continue
    }

    if ($PSCmdlet.ShouldProcess($user.SamAccountName, "Definir mail/proxyAddresses = $upn")) {
        try {
            if ($precisaMail) {
                Set-ADUser -Identity $user.SamAccountName -EmailAddress $upn
            }
            if ($precisaProxy) {
                # Remover outros SMTP: primarios antes de adicionar o novo, manter o resto
                $novaLista = @($proxyAtual | Where-Object { $_ -notmatch '^SMTP:' -and $_ -notmatch '^smtp:' })
                $novaLista += $proxyDesejado
                Set-ADUser -Identity $user.SamAccountName -Replace @{proxyAddresses = $novaLista}
            }
            Log "[DONE] '$($user.SamAccountName)': mail/proxyAddresses -> $upn"
            $atualizados++
        } catch {
            Log "[ERRO] '$($user.SamAccountName)': $($_.Exception.Message)"
        }
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Yellow
Write-Host "    Atualizados: $atualizados" -ForegroundColor $(if ($atualizados -gt 0) {'Green'} else {'Gray'})
Write-Host "    Ja OK:       $jaOk" -ForegroundColor Gray
Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
