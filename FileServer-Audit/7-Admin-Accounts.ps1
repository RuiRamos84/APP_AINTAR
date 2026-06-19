<#
.SYNOPSIS
    Criar contas admin dedicadas e reduzir Domain Admins.
.DESCRIPTION
    Cria contas administrativas dedicadas (adm.*) para substituir o uso
    de contas pessoais como Domain Admin. Remove contas desnecessarias
    de Domain Admins.
    Executar num DC, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\7-Admin-Accounts.ps1 -WhatIf
    .\7-Admin-Accounts.ps1
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Admin-Accounts_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

$domainDN = (Get-ADDomain).DistinguishedName
$adminOU  = "OU=Admin,OU=Aintar,$domainDN"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Contas Admin Dedicadas + Reduzir Domain Admins ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# 1. Criar contas admin dedicadas
# ---------------------------------------------------------------
Write-Host "[1/2] A criar contas admin dedicadas..." -ForegroundColor Yellow

$adminAccounts = @(
    @{
        Sam  = 'adm.rui.ramos'
        Name = 'Admin - Rui Ramos'
        Desc = 'Conta administrativa dedicada de Rui Ramos -- usar apenas para tarefas admin'
    },
    @{
        Sam  = 'adm.ricardosousa'
        Name = 'Admin - Ricardo Sousa'
        Desc = 'Conta administrativa dedicada de Ricardo Sousa -- usar apenas para tarefas admin'
    }
)

foreach ($adm in $adminAccounts) {
    $existing = Get-ADUser -Filter "SamAccountName -eq '$($adm.Sam)'" -ErrorAction SilentlyContinue
    if ($existing) {
        Log "[OK]   Conta '$($adm.Sam)' ja existe"
        continue
    }

    if ($PSCmdlet.ShouldProcess($adm.Sam, "Criar conta admin dedicada")) {
        # Gerar password temporaria segura
        $tempPass = -join ((65..90) + (97..122) + (48..57) + (33,35,36,37,38) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

        try {
            New-ADUser `
                -SamAccountName $adm.Sam `
                -Name $adm.Name `
                -DisplayName $adm.Name `
                -Description $adm.Desc `
                -Path $adminOU `
                -AccountPassword (ConvertTo-SecureString $tempPass -AsPlainText -Force) `
                -ChangePasswordAtLogon $true `
                -Enabled $true `
                -PasswordNeverExpires $false

            # Adicionar a Domain Admins
            Add-ADGroupMember -Identity 'Domain Admins' -Members $adm.Sam

            Log "[NOVO] Conta '$($adm.Sam)' criada em $adminOU"
            Log "       IMPORTANTE: Alterar no primeiro logon!"
            Write-Host ""
            Write-Host "       >>> PASSWORD TEMPORARIA de $($adm.Sam): $tempPass <<<" -ForegroundColor Red
            Write-Host "       >>> Alterar no primeiro logon! <<<" -ForegroundColor Red
            Write-Host ""
        } catch {
            Log "[ERRO] Criar '$($adm.Sam)': $($_.Exception.Message)"
        }
    }
}

# ---------------------------------------------------------------
# 2. Remover contas desnecessarias de Domain Admins
# ---------------------------------------------------------------
Write-Host "[2/2] A reduzir Domain Admins..." -ForegroundColor Yellow

# Contas a REMOVER de Domain Admins
# Substituto: conta adm.* que tem de estar em Domain Admins ANTES de remover a pessoal
# (evita ficar sem nenhum Domain Admin funcional)
$removerDA = @(
    @{ Conta = 'rui.ramos';      Razao = 'Conta pessoal -- usar adm.rui.ramos';    Substituto = 'adm.rui.ramos' },
    @{ Conta = 'ricardosousa';   Razao = 'Conta pessoal -- usar adm.ricardosousa'; Substituto = 'adm.ricardosousa' },
    @{ Conta = 'altice.admin';   Razao = 'Fornecedor antigo -- desativada';        Substituto = $null },
    @{ Conta = 'adminaintar';    Razao = 'Admin duplicado -- desativada';          Substituto = $null },
    @{ Conta = 'Off365Sync';     Razao = 'Sync antigo -- nao precisa de Domain Admin'; Substituto = $null }
)

$membrosDA = Get-ADGroupMember -Identity 'Domain Admins' -ErrorAction SilentlyContinue

foreach ($item in $removerDA) {
    $conta = $item.Conta
    $razao = $item.Razao

    # Verificar se esta no grupo
    $isMember = $membrosDA | Where-Object { $_.SamAccountName -eq $conta }

    if (-not $isMember) {
        Log "[OK]   '$conta' ja nao esta em Domain Admins"
        continue
    }

    # Se ha um substituto definido, garantir que ja esta em Domain Admins
    # antes de remover a conta pessoal -- caso contrario, ficamos sem acesso
    if ($item.Substituto) {
        $substitutoOk = $membrosDA | Where-Object { $_.SamAccountName -eq $item.Substituto }
        if (-not $substitutoOk) {
            Log "[SKIP] '$conta' NAO removido -- substituto '$($item.Substituto)' ainda nao esta em Domain Admins"
            Log "       Confirma que '$($item.Substituto)' foi criado (passo 1) e consegue fazer login antes de repetir este script"
            continue
        }
    }

    if ($PSCmdlet.ShouldProcess("$conta de Domain Admins", "Remover ($razao)")) {
        try {
            Remove-ADGroupMember -Identity 'Domain Admins' -Members $conta -Confirm:$false
            Log "[DONE] '$conta' removido de Domain Admins -- $razao"
        } catch {
            Log "[ERRO] Remover '$conta' de DA: $($_.Exception.Message)"
        }
    }
}

# Remover Off365Sync de Enterprise Admins tambem
$isEA = Get-ADGroupMember -Identity 'Enterprise Admins' -ErrorAction SilentlyContinue |
    Where-Object { $_.SamAccountName -eq 'Off365Sync' }
if ($isEA) {
    if ($PSCmdlet.ShouldProcess("Off365Sync de Enterprise Admins", "Remover")) {
        Remove-ADGroupMember -Identity 'Enterprise Admins' -Members 'Off365Sync' -Confirm:$false
        Log "[DONE] 'Off365Sync' removido de Enterprise Admins"
    }
}

Write-Host ""
Write-Host "=== Domain Admins apos limpeza ===" -ForegroundColor Yellow
Get-ADGroupMember -Identity 'Domain Admins' | ForEach-Object {
    Write-Host "    $($_.SamAccountName)" -ForegroundColor $(
        if ($_.SamAccountName -match '^adm\.') { 'Green' }
        elseif ($_.SamAccountName -eq 'Administrator') { 'Green' }
        else { 'Yellow' }
    )
}

Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
