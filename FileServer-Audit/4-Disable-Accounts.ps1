<#
.SYNOPSIS
    Desativar contas inativas no AD da AINTAR.
.DESCRIPTION
    Desativa contas identificadas como abandonadas/desnecessarias.
    NAO apaga -- apenas desativa. Mover para OU de desativados fica para depois.
    Executar num DC ou maquina com RSAT, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\4-Disable-Accounts.ps1           # Executa
    .\4-Disable-Accounts.ps1 -WhatIf   # Simula apenas
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Disable-Accounts_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Desativar Contas Inativas -- AINTAR ===" -ForegroundColor Cyan
Write-Host ""

# -- Contas a desativar (validadas com o Rui em 12/06/2026) --
$contasDesativar = @(
    @{ Conta = 'altice.admin';       Razao = 'Fornecedor Altice -- sem logon desde Mar/2023' },
    @{ Conta = 'pa.userID';          Razao = 'Palo Alto User ID -- sem logon desde Jan/2023' },
    @{ Conta = 'AIRC_VPN';           Razao = 'VPN AIRC antiga -- sem logon desde Jun/2023' },
    @{ Conta = 'AINTAR_VPN';         Razao = 'VPN AINTAR antiga -- sem logon desde Out/2023' },
    @{ Conta = 'developer.iis';      Razao = 'Dev IIS -- sem logon desde Jul/2023' },
    @{ Conta = 'adminaintar';        Razao = 'Admin duplicado -- sem logon desde Out/2023' },
    @{ Conta = 'teste365';           Razao = 'Conta de teste -- nunca fez logon' },
    @{ Conta = 'goncalorodrigues';   Razao = 'Foi para operacao de rua -- ja nao precisa de acesso' },
    @{ Conta = 'Off365Sync';         Razao = 'Sync O365 antigo -- sem logon desde Abr/2023 (confirmar AD Connect)' }
)

$desativadas = 0
$jaDesativadas = 0
$erros = 0

foreach ($item in $contasDesativar) {
    $conta = $item.Conta
    $razao = $item.Razao

    try {
        $user = Get-ADUser -Identity $conta -Properties Enabled, Description
    } catch {
        Log "[ERRO] Conta '$conta' nao encontrada no AD"
        $erros++
        continue
    }

    if (-not $user.Enabled) {
        Log "[OK]   '$conta' ja esta desativada"
        $jaDesativadas++
        continue
    }

    if ($PSCmdlet.ShouldProcess($conta, "Desativar conta ($razao)")) {
        try {
            # Guardar descricao original e adicionar motivo
            $descOriginal = $user.Description
            $novaDesc = "DESATIVADA $stamp -- $razao"
            if ($descOriginal) { $novaDesc = "$novaDesc | Desc original: $descOriginal" }

            Disable-ADAccount -Identity $conta
            Set-ADUser -Identity $conta -Description $novaDesc

            Log "[DONE] '$conta' desativada -- $razao"
            $desativadas++
        } catch {
            Log "[ERRO] Falha ao desativar '$conta': $($_.Exception.Message)"
            $erros++
        }
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Yellow
Write-Host "    Desativadas:    $desativadas" -ForegroundColor $(if ($desativadas -gt 0) {'Green'} else {'Gray'})
Write-Host "    Ja desativadas: $jaDesativadas" -ForegroundColor Gray
Write-Host "    Erros:          $erros" -ForegroundColor $(if ($erros -gt 0) {'Red'} else {'Gray'})
Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
