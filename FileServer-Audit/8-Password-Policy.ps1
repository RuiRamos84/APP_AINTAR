<#
.SYNOPSIS
    Remover 'password nunca expira' de contas pessoais.
.DESCRIPTION
    Remove a flag PasswordNeverExpires de todas as contas de pessoas.
    Mantem a flag apenas em contas de servico (svc.*, MSOL_*, etc.).
    Executar num DC ou maquina com RSAT, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\8-Password-Policy.ps1 -WhatIf
    .\8-Password-Policy.ps1
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Password-Policy_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Politica de Passwords -- AINTAR ===" -ForegroundColor Cyan
Write-Host ""

# Contas de pessoas que devem ter password com expiracao
$contasPessoas = @(
    'ricardosousa', 'claudiasantos', 'auditor', 'pedropatricio', 'alexandrapinto',
    'luispedro', 'patriciacosta', 'dianaloio', 'pedrodinis', 'inescaeiro',
    'americoferreira', 'nunosousa',
    'anarita', 'vaniatrovao', 'claudiamarques', 'monicafigueiredo',
    'josemelo', 'karinecosta', 'tiagomatos',
    'rui.ramos', 'guilhermefigueiredo',
    'officelan.admin', 'aintar.admin'
)

# Contas de servico -- NAO alterar (OK com password sem expiracao)
$contasServico = @(
    'ScannerRicoh', 'fortinet', 'ADSync', 'MSOL_19c20b45ddbd'
)

Write-Host "[1/2] A alterar contas de pessoas..." -ForegroundColor Yellow
$alteradas = 0
$jaOk = 0

foreach ($conta in $contasPessoas) {
    try {
        $user = Get-ADUser -Identity $conta -Properties PasswordNeverExpires
    } catch {
        Log "[AVISO] Conta '$conta' nao encontrada"
        continue
    }

    if (-not $user.PasswordNeverExpires) {
        Log "[OK]   '$conta' ja tem password com expiracao"
        $jaOk++
        continue
    }

    if ($PSCmdlet.ShouldProcess($conta, "Remover PasswordNeverExpires")) {
        Set-ADUser -Identity $conta -PasswordNeverExpires $false
        Log "[DONE] '$conta' -- password agora expira normalmente"
        $alteradas++
    }
}

Write-Host ""
Write-Host "[2/2] Contas de servico (NAO alteradas):" -ForegroundColor Yellow
foreach ($svc in $contasServico) {
    try {
        $user = Get-ADUser -Identity $svc -Properties PasswordNeverExpires
        $status = if ($user.PasswordNeverExpires) { 'Password nunca expira (OK para servico)' } else { 'Password expira (atencao!)' }
        Log "[SVC]  '$svc' -- $status"
    } catch {
        Log "[AVISO] '$svc' nao encontrada"
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Yellow
Write-Host "    Alteradas:      $alteradas" -ForegroundColor $(if ($alteradas -gt 0) {'Green'} else {'Gray'})
Write-Host "    Ja OK:          $jaOk" -ForegroundColor Gray
Write-Host "    Servico (skip): $($contasServico.Count)" -ForegroundColor Gray
Write-Host ""

if ($alteradas -gt 0) {
    Write-Host "NOTA: Os utilizadores terao de alterar a password na proxima" -ForegroundColor Yellow
    Write-Host "      expiracao. Recomendar alteracao proativa para evitar" -ForegroundColor Yellow
    Write-Host "      interrupcoes de servico." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
