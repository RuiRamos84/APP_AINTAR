<#
.SYNOPSIS
    Corrigir UserPrincipalName (UPN) dos utilizadores para o dominio aintar.pt.
.DESCRIPTION
    Pre-requisito para o Microsoft Entra Connect: os UPNs tem de estar num
    dominio verificado no Entra ID (aintar.pt), nao em AINTAR.LOCAL.

    Este script:
      1. Adiciona 'aintar.pt' como UPN suffix alternativo no forest (se ainda
         nao existir).
      2. Para cada utilizador em OU=Utilizadores,OU=Aintar cujo UPN termina
         em '@AINTAR.LOCAL' ou esta vazio, define um novo UPN
         '<samaccountname-sem-pontos>@aintar.pt'.
      3. Utilizadores que ja tenham UPN '@aintar.pt' nao sao alterados.

    Executar num DC ou maquina com RSAT, como Domain Admin (ou conta com
    permissao para alterar o Forest UPN suffixes -- normalmente requer
    Enterprise Admin).
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\12-Fix-UPNs.ps1 -WhatIf
    .\12-Fix-UPNs.ps1
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$NovoSuffixo = 'aintar.pt'
)

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Fix-UPNs_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

$domainDN = (Get-ADDomain).DistinguishedName
$searchBase = "OU=Utilizadores,OU=Aintar,$domainDN"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Corrigir UPNs -- AINTAR ===" -ForegroundColor Cyan
Write-Host "    Novo sufixo: @$NovoSuffixo" -ForegroundColor Yellow
Write-Host ""

# ---------------------------------------------------------------
# 1. Adicionar UPN suffix ao forest
# ---------------------------------------------------------------
Write-Host "[1/2] A verificar UPN suffixes do forest..." -ForegroundColor Yellow

$forest = Get-ADForest
if ($forest.UPNSuffixes -contains $NovoSuffixo) {
    Log "[OK]   Suffixo '$NovoSuffixo' ja existe no forest"
} else {
    if ($PSCmdlet.ShouldProcess($NovoSuffixo, "Adicionar UPN suffix ao forest")) {
        try {
            Set-ADForest -Identity $forest.Name -UPNSuffixes @{Add = $NovoSuffixo}
            Log "[DONE] Suffixo '$NovoSuffixo' adicionado ao forest"
        } catch {
            Log "[ERRO] Adicionar UPN suffix: $($_.Exception.Message)"
            Log "       Pode ser necessario uma conta Enterprise Admin para esta operacao"
        }
    }
}

# ---------------------------------------------------------------
# 2. Corrigir UPN de cada utilizador
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[2/2] A corrigir UPNs dos utilizadores..." -ForegroundColor Yellow

$contasServico = @('fortinet', 'ADSync', 'ScannerRicoh')

$utilizadores = Get-ADUser -Filter * -SearchBase $searchBase -Properties UserPrincipalName, mail |
    Where-Object { $_.SamAccountName -notin $contasServico }

$corrigidos = 0
$jaOk = 0

foreach ($user in $utilizadores) {
    $upnAtual = $user.UserPrincipalName

    if ($upnAtual -and $upnAtual -like "*@$NovoSuffixo") {
        Log "[OK]   '$($user.SamAccountName)' ja tem UPN correto: $upnAtual"
        $jaOk++
        continue
    }

    $localPart = $user.SamAccountName -replace '\.', ''
    $novoUpn = "$localPart@$NovoSuffixo"

    if ($PSCmdlet.ShouldProcess($user.SamAccountName, "Alterar UPN de '$upnAtual' para '$novoUpn'")) {
        try {
            Set-ADUser -Identity $user.SamAccountName -UserPrincipalName $novoUpn
            Log "[DONE] '$($user.SamAccountName)': '$upnAtual' -> '$novoUpn'"
            $corrigidos++
        } catch {
            Log "[ERRO] '$($user.SamAccountName)': $($_.Exception.Message)"
        }
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Yellow
Write-Host "    Corrigidos: $corrigidos" -ForegroundColor $(if ($corrigidos -gt 0) {'Green'} else {'Gray'})
Write-Host "    Ja OK:      $jaOk" -ForegroundColor Gray
Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
