# Setup-CredSSP.ps1
# Script para configurar CredSSP automaticamente para WinRM
# IMPORTANTE: Este script deve ser executado como Administrador
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# VERIFICAR PRIVILÉGIOS DE ADMINISTRADOR
# ============================================================================

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "ERRO: Este script deve ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Por favor, clique com o botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# CONFIGURAÇÕES
# ============================================================================

$ServerIP = "172.16.2.35"
$ServerName = "172.16.2.35"  # ou use o nome DNS se tiver

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    CONFIGURAÇÃO AUTOMÁTICA DE CREDSSP      " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# DIAGNÓSTICO INICIAL
# ============================================================================

Write-Host "[1/6] Verificando estado atual do WinRM..." -ForegroundColor Yellow

try {
    $winrmStatus = Test-WSMan -ComputerName "localhost" -ErrorAction SilentlyContinue
    if ($winrmStatus) {
        Write-Host "  [OK] WinRM está ativo no computador local" -ForegroundColor Green
    }
} catch {
    Write-Host "  [AVISO] WinRM não está configurado. Configurando..." -ForegroundColor Yellow
    winrm quickconfig -force
}

Write-Host ""
Write-Host "[2/6] Verificando CredSSP no cliente..." -ForegroundColor Yellow

$clientCredSSP = Get-WSManCredSSP
Write-Host "  Estado atual:" -ForegroundColor Gray
Write-Host "  $clientCredSSP" -ForegroundColor Gray

# ============================================================================
# HABILITAR CREDSSP NO CLIENTE
# ============================================================================

Write-Host ""
Write-Host "[3/6] Habilitando CredSSP no cliente..." -ForegroundColor Yellow

try {
    Enable-WSManCredSSP -Role Client -DelegateComputer $ServerName -Force
    Write-Host "  [OK] CredSSP habilitado como Cliente" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Falha ao habilitar CredSSP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# CONFIGURAR POLÍTICA DE GRUPO LOCAL
# ============================================================================

Write-Host ""
Write-Host "[4/6] Configurando política de delegação de credenciais..." -ForegroundColor Yellow

$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CredentialsDelegation"
$regKeyFresh = "AllowFreshCredentials"
$regKeyFreshNTLM = "AllowFreshCredentialsWhenNTLMOnly"

# Criar a chave de registro se não existir
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
    Write-Host "  [OK] Chave de registro criada" -ForegroundColor Green
}

# Habilitar delegação de credenciais novas
Set-ItemProperty -Path $regPath -Name "AllowFreshCredentials" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $regPath -Name "AllowFreshCredentialsWhenNTLMOnly" -Value 1 -Type DWord -Force
Write-Host "  [OK] Políticas habilitadas" -ForegroundColor Green

# Configurar lista de servidores permitidos
$freshPath = "$regPath\$regKeyFresh"
$freshNTLMPath = "$regPath\$regKeyFreshNTLM"

# Criar subchaves se não existirem
if (-not (Test-Path $freshPath)) {
    New-Item -Path $freshPath -Force | Out-Null
}
if (-not (Test-Path $freshNTLMPath)) {
    New-Item -Path $freshNTLMPath -Force | Out-Null
}

# Adicionar servidores permitidos
$allowedServers = @(
    "WSMAN/$ServerIP",
    "WSMAN/*.$($env:USERDNSDOMAIN)",
    "WSMAN/$ServerName"
)

$index = 1
foreach ($server in $allowedServers) {
    Set-ItemProperty -Path $freshPath -Name "$index" -Value $server -Type String -Force
    Set-ItemProperty -Path $freshNTLMPath -Name "$index" -Value $server -Type String -Force
    Write-Host "  [OK] Adicionado: $server" -ForegroundColor Green
    $index++
}

# ============================================================================
# ATUALIZAR POLÍTICA DE GRUPO
# ============================================================================

Write-Host ""
Write-Host "[5/6] Atualizando política de grupo..." -ForegroundColor Yellow

try {
    gpupdate /force | Out-Null
    Write-Host "  [OK] Política de grupo atualizada" -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Não foi possível atualizar automaticamente. Execute 'gpupdate /force' manualmente." -ForegroundColor Yellow
}

# ============================================================================
# VERIFICAÇÃO FINAL
# ============================================================================

Write-Host ""
Write-Host "[6/6] Verificando configuração final..." -ForegroundColor Yellow

$finalStatus = Get-WSManCredSSP
Write-Host "  Estado final do CredSSP:" -ForegroundColor Gray
Write-Host "  $finalStatus" -ForegroundColor Gray

# ============================================================================
# RESUMO
# ============================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "          CONFIGURAÇÃO CONCLUÍDA            " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Execute o deployment novamente" -ForegroundColor White
Write-Host "2. Se ainda houver erros, reinicie o computador" -ForegroundColor White
Write-Host "3. Verifique se o servidor $ServerIP também tem WinRM habilitado" -ForegroundColor White
Write-Host ""
Write-Host "NOTA DE SEGURANÇA:" -ForegroundColor Yellow
Write-Host "CredSSP permite delegação de credenciais. Certifique-se de que" -ForegroundColor Gray
Write-Host "está conectando apenas a servidores confiáveis." -ForegroundColor Gray
Write-Host ""

# ============================================================================
# TESTE DE CONECTIVIDADE (OPCIONAL)
# ============================================================================

Write-Host "Deseja testar a conectividade WinRM agora? (S/N): " -NoNewline -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "Testando conectividade com $ServerIP..." -ForegroundColor Yellow

    # Solicitar credenciais
    Write-Host "Por favor, insira as credenciais para o servidor:" -ForegroundColor Yellow
    $cred = Get-Credential

    try {
        $result = Invoke-Command -ComputerName $ServerIP -Credential $cred -Authentication Credssp -ScriptBlock {
            $env:COMPUTERNAME
        } -ErrorAction Stop

        Write-Host "[OK] Conexão bem-sucedida! Servidor: $result" -ForegroundColor Green
    } catch {
        Write-Host "[ERRO] Falha na conexão: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "- O servidor não tem WinRM habilitado" -ForegroundColor Gray
        Write-Host "- O servidor não permite CredSSP" -ForegroundColor Gray
        Write-Host "- Firewall bloqueando porta 5985/5986" -ForegroundColor Gray
        Write-Host "- Credenciais incorretas" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Pressione Enter para sair..." -NoNewline
Read-Host
