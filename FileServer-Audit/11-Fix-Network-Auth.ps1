<#
.SYNOPSIS
    Corrigir deteccao de rede/DNS do PC para autenticar corretamente contra o
    dominio AINTAR.LOCAL (DC = 172.16.2.20), permitindo o ecra de "alterar
    password" e o acesso ao FileServer com as mesmas credenciais do login.
.DESCRIPTION
    Aplica, numa unica execucao, a sequencia de correcoes validada em
    PC-RUI-RAMOS:
      1. Renovar DHCP (release/renew) e limpar cache DNS
      2. Garantir DNS = 172.16.2.20 (DC) no adaptador de rede ativo
      3. Reiniciar o servico NLA (Network Location Awareness)
      4. Verificar/forcar a categoria de rede para "Private"
      5. Validar localizacao do DC (nltest /dsgetdc)
      6. Reparar o canal seguro do computador com o dominio
         (Test-ComputerSecureChannel -Repair)

    Executar LOCALMENTE em cada PC, em PowerShell como Administrador.
    No passo 6 vai pedir credenciais -- usar uma conta com permissao para
    fazer join/repair ao dominio (ex: adm.rui.ramos).

    Depois de correr este script com sucesso, o utilizador deve fazer:
      Win+L -> "Opcoes de entrada" -> icone de password -> introduzir a
      password atual -> deve aparecer o ecra azul "A palavra-passe expirou.
      Tem de alterar a palavra-passe" -> definir nova password.

    NOTA: Se o adaptador ja estiver com DNS correto via DHCP (apos a
    alteracao no FortiGate), os passos 1-2 sao apenas confirmacao.
.PARAMETER DcIP
    IP do Domain Controller (default: 172.16.2.20)
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\11-Fix-Network-Auth.ps1 -WhatIf
    .\11-Fix-Network-Auth.ps1
#>


[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$DcIP = '172.16.2.20',
    [string]$DomainName = 'AINTAR.LOCAL'
)

$ErrorActionPreference = 'Continue'

# Confirmar que esta a correr como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Este script tem de correr num PowerShell como Administrador." -ForegroundColor Red
    Write-Host "       Clica com o botao direito no PowerShell -> 'Executar como Administrador' e tenta novamente." -ForegroundColor Red
    exit 1
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "Fix-Network-Auth_$($env:COMPUTERNAME)_$stamp.log"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Host "=== Corrigir Rede/DNS/Auth -- AINTAR ===" -ForegroundColor Cyan
Write-Host "    PC: $env:COMPUTERNAME | Utilizador: $env:USERNAME" -ForegroundColor Yellow
Write-Host ""

# ---------------------------------------------------------------
# 1. Identificar adaptador de rede ativo
# ---------------------------------------------------------------
Write-Host "[1/6] A identificar adaptador de rede ativo..." -ForegroundColor Yellow

$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if (-not $adapter) {
    Log "[ERRO] Nenhum adaptador de rede ativo encontrado. Abortar."
    exit 1
}
Log "[OK]   Adaptador ativo: $($adapter.Name) (InterfaceIndex $($adapter.InterfaceIndex))"

# ---------------------------------------------------------------
# 2. Renovar DHCP e limpar cache DNS
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[2/6] A renovar DHCP e limpar cache DNS..." -ForegroundColor Yellow

if ($PSCmdlet.ShouldProcess($adapter.Name, "Renovar DHCP")) {
    ipconfig /release | Out-Null
    ipconfig /renew    | Out-Null
    ipconfig /flushdns | Out-Null
    Log "[OK]   DHCP renovado e cache DNS limpa"
}

# ---------------------------------------------------------------
# 3. Garantir DNS = DC
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[3/6] A verificar servidor DNS..." -ForegroundColor Yellow

$dnsAtual = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses

if ($dnsAtual -contains $DcIP) {
    Log "[OK]   DNS ja inclui o DC ($DcIP): $($dnsAtual -join ', ')"
} else {
    Log "[AVISO] DNS atual ($($dnsAtual -join ', ')) nao inclui o DC. A corrigir para $DcIP..."
    if ($PSCmdlet.ShouldProcess($adapter.Name, "Definir DNS = $DcIP")) {
        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses $DcIP
        ipconfig /flushdns | Out-Null
        Log "[DONE] DNS definido para $DcIP"
    }
}

# ---------------------------------------------------------------
# 4. Reiniciar NLA e verificar categoria de rede
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[4/6] A reiniciar deteccao de rede (NLA)..." -ForegroundColor Yellow

if ($PSCmdlet.ShouldProcess('NlaSvc', "Reiniciar servico")) {
    Restart-Service NlaSvc -Force
    Start-Sleep -Seconds 5
    Log "[OK]   Servico NLA reiniciado"
}

$profile = Get-NetConnectionProfile -InterfaceIndex $adapter.InterfaceIndex
Log "[INFO] Categoria de rede atual: $($profile.NetworkCategory)"

if ($profile.NetworkCategory -eq 'Public') {
    Log "[AVISO] Categoria 'Public' -- a forcar para 'Private'..."
    if ($PSCmdlet.ShouldProcess($adapter.Name, "Definir categoria de rede = Private")) {
        Set-NetConnectionProfile -InterfaceIndex $adapter.InterfaceIndex -NetworkCategory Private
        Log "[DONE] Categoria de rede definida para 'Private'"
    }
} else {
    Log "[OK]   Categoria de rede ja e '$($profile.NetworkCategory)'"
}

# ---------------------------------------------------------------
# 5. Validar localizacao do DC
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[5/6] A validar localizacao do Domain Controller..." -ForegroundColor Yellow

$dsgetdc = nltest /dsgetdc:$DomainName 2>&1 | Out-String
if ($dsgetdc -match 'DC: \\\\') {
    Log "[OK]   nltest /dsgetdc:$DomainName -- sucesso"
} else {
    Log "[AVISO] nltest /dsgetdc:$DomainName ainda falha. Detalhe:"
    Log $dsgetdc.Trim()
}

# ---------------------------------------------------------------
# 6. Reparar canal seguro do computador com o dominio
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[6/6] A reparar canal seguro com o dominio..." -ForegroundColor Yellow
Write-Host "       (vai pedir credenciais -- usar conta admin, ex: adm.rui.ramos)" -ForegroundColor Gray

$secureChannelOk = Test-ComputerSecureChannel
if ($secureChannelOk) {
    Log "[OK]   Canal seguro com o dominio ja esta OK"
} else {
    if ($PSCmdlet.ShouldProcess($env:COMPUTERNAME, "Reparar canal seguro com o dominio")) {
        $cred = Get-Credential -Message "Credenciais de administrador do dominio (ex: adm.rui.ramos)"
        $repaired = Test-ComputerSecureChannel -Repair -Credential $cred
        if ($repaired) {
            Log "[DONE] Canal seguro reparado com sucesso"
        } else {
            Log "[ERRO] Falha ao reparar canal seguro -- ver mensagem acima"
        }
    }
}

Write-Host ""
Write-Host "=== Proximo passo para o utilizador ===" -ForegroundColor Cyan
Write-Host "  1. Win+L" -ForegroundColor Gray
Write-Host "  2. Clicar em 'Opcoes de entrada' (se aparecer Windows Hello/PIN)" -ForegroundColor Gray
Write-Host "  3. Escolher o icone de password e introduzir a password ATUAL" -ForegroundColor Gray
Write-Host "  4. Deve aparecer o ecra azul 'A palavra-passe expirou'" -ForegroundColor Gray
Write-Host "  5. Definir a nova password (sera a mesma para PC e FileServer)" -ForegroundColor Gray
Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
