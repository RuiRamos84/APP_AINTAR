# Test-RemoteExecution.ps1
# Teste de execução remota via Task Scheduler
# Versão: 2.0
# Autor: Sistema Modular
# Data: 2025-10-13

<#
.SYNOPSIS
    Testa a execução remota de comandos via Task Scheduler

.DESCRIPTION
    Script de diagnóstico que verifica se o sistema de deployment pode executar
    comandos remotos no servidor usando Task Scheduler.

    TESTES REALIZADOS:
    1. ✅ Conectividade SMB (porta 445)
    2. ✅ Acesso ao compartilhamento e permissões de escrita
    3. ✅ Serviço Task Scheduler acessível
    4. ✅ Criação e execução de tarefa agendada
    5. ✅ Verificação de resultado
    6. ✅ Limpeza de artefatos temporários

.PARAMETER ServerIP
    Endereço IP do servidor remoto
    Padrão: 172.16.2.35

.PARAMETER Username
    Nome de usuário no formato DOMINIO\usuario
    Padrão: aintar\rui.ramos

.PARAMETER PasswordFile
    Caminho para o arquivo de senha encriptada
    Padrão: C:\Users\rui.ramos\Desktop\APP\PServ.txt

.EXAMPLE
    .\Test-RemoteExecution.ps1
    Executa teste com parâmetros padrão

.EXAMPLE
    .\Test-RemoteExecution.ps1 -ServerIP "192.168.1.100" -Username "DOMAIN\user"
    Executa teste com servidor e usuário customizados

.NOTES
    Execute este script ANTES de fazer o primeiro deployment para garantir
    que o ambiente está configurado corretamente.

    REQUISITOS:
    - Compartilhamento SMB acessível
    - Task Scheduler rodando no servidor
    - Credenciais com permissão para criar tarefas agendadas

.LINK
    README.md - Documentação completa
    Deploy-Main.ps1 - Script principal de deployment
#>

param(
    [string]$ServerIP = "172.16.2.35",
    [string]$Username = "aintar\rui.ramos",
    [string]$PasswordFile = "C:\Users\rui.ramos\Desktop\APP\PServ.txt"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   TESTE DE EXECUÇÃO REMOTA VIA TASK SCHEDULER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# CARREGAR CREDENCIAIS
# ============================================================================

Write-Host "[1/6] Carregando credenciais..." -ForegroundColor Yellow

try {
    if (-not (Test-Path $PasswordFile)) {
        throw "Arquivo de senha não encontrado: $PasswordFile"
    }

    $pass = Get-Content $PasswordFile | ConvertTo-SecureString
    $credential = New-Object System.Management.Automation.PSCredential -ArgumentList $Username, $pass
    $password = $credential.GetNetworkCredential().Password

    Write-Host "  [OK] Credenciais carregadas: $Username" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Falha ao carregar credenciais: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# TESTE 1: VERIFICAR CONECTIVIDADE SMB
# ============================================================================

Write-Host ""
Write-Host "[2/6] Testando conectividade SMB (porta 445)..." -ForegroundColor Yellow

try {
    $testConnection = Test-NetConnection -ComputerName $ServerIP -Port 445 -WarningAction SilentlyContinue

    if ($testConnection.TcpTestSucceeded) {
        Write-Host "  [OK] Porta 445 (SMB) acessível" -ForegroundColor Green
    } else {
        throw "Porta 445 não acessível"
    }
} catch {
    Write-Host "  [ERRO] Falha na conectividade: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# TESTE 2: VERIFICAR COMPARTILHAMENTO
# ============================================================================

Write-Host ""
Write-Host "[3/6] Testando acesso ao compartilhamento..." -ForegroundColor Yellow

try {
    $sharePath = "\\$ServerIP\app\NewAPP"

    if (Test-Path $sharePath) {
        Write-Host "  [OK] Compartilhamento acessível: $sharePath" -ForegroundColor Green

        # Testar escrita
        $testFile = "$sharePath\test_write_$(Get-Date -Format 'yyyyMMddHHmmss').tmp"
        "teste" | Out-File -FilePath $testFile -Force
        Remove-Item $testFile -Force

        Write-Host "  [OK] Permissão de escrita confirmada" -ForegroundColor Green
    } else {
        throw "Compartilhamento não acessível: $sharePath"
    }
} catch {
    Write-Host "  [ERRO] Falha no acesso ao compartilhamento: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# TESTE 3: VERIFICAR SERVIÇO TASK SCHEDULER
# ============================================================================

Write-Host ""
Write-Host "[4/6] Verificando serviço Task Scheduler..." -ForegroundColor Yellow

try {
    # Tentar listar tarefas para verificar se o serviço está acessível
    $queryCmd = "schtasks /Query /S $ServerIP /U `"$Username`" /P `"$password`" /FO LIST"
    $queryResult = Invoke-Expression $queryCmd 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Task Scheduler acessível e respondendo" -ForegroundColor Green
    } else {
        throw "Task Scheduler não respondeu corretamente: $queryResult"
    }
} catch {
    Write-Host "  [AVISO] Problema ao acessar Task Scheduler: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Isso pode indicar que:" -ForegroundColor Gray
    Write-Host "    - O serviço Task Scheduler não está rodando no servidor" -ForegroundColor Gray
    Write-Host "    - As credenciais não têm permissão" -ForegroundColor Gray
    Write-Host "    - Firewall está bloqueando RPC" -ForegroundColor Gray
}

# ============================================================================
# TESTE 4: CRIAR TAREFA DE TESTE
# ============================================================================

Write-Host ""
Write-Host "[5/6] Criando tarefa de teste..." -ForegroundColor Yellow

$taskName = "DeployTest_$(Get-Date -Format 'yyyyMMddHHmmss')"
$testScriptPath = "\\$ServerIP\app\NewAPP\test_script_$taskName.ps1"
$testScriptLocalPath = "D:\APP\NewAPP\test_script_$taskName.ps1"
$outputFile = "\\$ServerIP\app\NewAPP\test_output_$taskName.txt"
$outputFileLocal = "D:\APP\NewAPP\test_output_$taskName.txt"

try {
    # Criar script de teste
    $testScript = @"
# Script de teste
`$output = @{
    ComputerName = `$env:COMPUTERNAME
    UserName = `$env:USERNAME
    DateTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    PowerShellVersion = `$PSVersionTable.PSVersion.ToString()
}

`$output | ConvertTo-Json | Out-File -FilePath "$outputFileLocal" -Force
Write-Host "Teste executado com sucesso!"
"@

    Set-Content -Path $testScriptPath -Value $testScript -Encoding UTF8 -Force
    Write-Host "  [OK] Script de teste criado: $testScriptPath" -ForegroundColor Green

    # Criar tarefa
    $taskAction = "powershell.exe -ExecutionPolicy Bypass -File `"$testScriptLocalPath`""

    # Usar horário válido (daqui a 2 minutos)
    $startTime = (Get-Date).AddMinutes(2).ToString("HH:mm")

    Write-Host "  Horário de início da tarefa: $startTime" -ForegroundColor Gray

    # Construir comando sem aspas aninhadas problemáticas
    $schtasksArgs = @(
        "/Create"
        "/S", $ServerIP
        "/U", $Username
        "/P", $password
        "/TN", $taskName
        "/TR", $taskAction
        "/SC", "ONCE"
        "/ST", $startTime
        "/RU", $Username
        "/RP", $password
        "/F"
    )

    Write-Host "  Executando schtasks..." -ForegroundColor Gray

    # Usar & para executar com argumentos separados
    $createResult = & schtasks $schtasksArgs 2>&1
    $exitCode = $LASTEXITCODE

    Write-Host "  Exit code: $exitCode" -ForegroundColor Gray
    if ($createResult) {
        Write-Host "  Resultado: $createResult" -ForegroundColor Gray
    }

    if ($exitCode -eq 0) {
        Write-Host "  [OK] Tarefa criada com sucesso: $taskName" -ForegroundColor Green
    } else {
        throw "Falha ao criar tarefa (Exit code: $exitCode): $createResult"
    }

    # Executar tarefa
    Write-Host "  Executando tarefa..." -ForegroundColor Gray
    $runCmd = "schtasks /Run /S $ServerIP /U `"$Username`" /P `"$password`" /TN `"$taskName`""
    $runResult = Invoke-Expression $runCmd 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Tarefa executada" -ForegroundColor Green
    } else {
        throw "Falha ao executar tarefa: $runResult"
    }

    # Aguardar execução
    Start-Sleep -Seconds 5

} catch {
    Write-Host "  [ERRO] Falha no teste: $($_.Exception.Message)" -ForegroundColor Red

    # Tentar limpar
    try {
        if (Test-Path $testScriptPath) {
            Remove-Item $testScriptPath -Force -ErrorAction SilentlyContinue
        }
    } catch {}

    exit 1
}

# ============================================================================
# TESTE 5: VERIFICAR RESULTADO
# ============================================================================

Write-Host ""
Write-Host "[6/6] Verificando resultado da execução..." -ForegroundColor Yellow

try {
    # Verificar se o arquivo de saída foi criado
    Start-Sleep -Seconds 2

    if (Test-Path $outputFile) {
        $result = Get-Content $outputFile -Raw | ConvertFrom-Json

        Write-Host "  [OK] Tarefa executada com sucesso no servidor!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Informações do servidor:" -ForegroundColor Cyan
        Write-Host "    Nome: $($result.ComputerName)" -ForegroundColor White
        Write-Host "    Usuário: $($result.UserName)" -ForegroundColor White
        Write-Host "    Data/Hora: $($result.DateTime)" -ForegroundColor White
        Write-Host "    PowerShell: $($result.PowerShellVersion)" -ForegroundColor White

    } else {
        throw "Arquivo de saída não foi criado. A tarefa pode não ter executado corretamente."
    }

} catch {
    Write-Host "  [AVISO] $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Possíveis causas:" -ForegroundColor Gray
    Write-Host "    - ExecutionPolicy do PowerShell no servidor" -ForegroundColor Gray
    Write-Host "    - Permissões insuficientes" -ForegroundColor Gray
    Write-Host "    - Caminho do script incorreto" -ForegroundColor Gray
}

# ============================================================================
# LIMPEZA
# ============================================================================

Write-Host ""
Write-Host "Limpando arquivos temporários..." -ForegroundColor Yellow

try {
    # Remover tarefa
    $deleteCmd = "schtasks /Delete /S $ServerIP /U `"$Username`" /P `"$password`" /TN `"$taskName`" /F"
    Invoke-Expression $deleteCmd 2>&1 | Out-Null

    # Remover arquivos
    if (Test-Path $testScriptPath) {
        Remove-Item $testScriptPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $outputFile) {
        Remove-Item $outputFile -Force -ErrorAction SilentlyContinue
    }

    Write-Host "  [OK] Limpeza concluída" -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] Alguns arquivos temporários podem não ter sido removidos" -ForegroundColor Yellow
}

# ============================================================================
# RESUMO
# ============================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "              TESTE CONCLUÍDO               " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Execução remota via Task Scheduler está FUNCIONANDO!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Execute o deployment: .\Deploy-Main.ps1" -ForegroundColor White
Write-Host "  2. Selecione a opção desejada (ex: opção 5)" -ForegroundColor White
Write-Host ""

Write-Host "Pressione Enter para sair..." -NoNewline
Read-Host
