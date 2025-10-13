# DeployServerManager.ps1
# Gestão remota de servidor via Task Scheduler
# Versão: 2.0
# Autor: Sistema Modular
# Data: 2025-10-13

<#
.SYNOPSIS
    Módulo de gestão remota de serviços no servidor via Task Scheduler

.DESCRIPTION
    Este módulo fornece funcionalidades para controlar serviços no servidor remoto
    (nginx, backend Python) e gerenciar o modo de manutenção.

    VERSÃO 2.0 - MUDANÇA IMPORTANTE:
    O sistema agora usa Task Scheduler (schtasks.exe) em vez de WinRM para execução remota.
    Isto elimina a necessidade de configurar WinRM, CredSSP e Group Policies.

    ARQUITETURA:
    ┌────────────────────────────────────────────────────────────┐
    │ Cliente (Workstation)                                      │
    │   └─ Invoke-RemoteServerCommand-TaskScheduler             │
    │       ├─ Cria script PowerShell temporário no servidor    │
    │       ├─ Cria Scheduled Task no servidor via schtasks     │
    │       ├─ Executa tarefa imediatamente                     │
    │       ├─ Aguarda conclusão                                │
    │       └─ Remove tarefa e script temporário                │
    └────────────────────────────────────────────────────────────┘
              │ SMB (porta 445) + schtasks.exe
              ↓
    ┌────────────────────────────────────────────────────────────┐
    │ Servidor (172.16.2.35)                                     │
    │   ├─ Task Scheduler executa script PowerShell             │
    │   ├─ Script controla serviços (nginx, Python)             │
    │   ├─ Script cria/remove maintenance.flag                  │
    │   └─ Logs salvos em D:\APP\NewAPP\deploy_log_*.txt        │
    └────────────────────────────────────────────────────────────┘

.FUNCTIONS
    Invoke-RemoteServerCommand
        Wrapper que delega para TaskScheduler ou WinRM (configurável)

    Invoke-RemoteServerCommand-TaskScheduler (PRINCIPAL - v2.0)
        Executa comandos remotos via Task Scheduler
        - Cria script temporário no servidor
        - Cria e executa Scheduled Task
        - Captura logs de execução
        - Limpa artefatos temporários

    Invoke-RemoteServerCommand-WinRM (LEGACY - v1.0)
        Executa comandos remotos via WinRM (mantido como fallback)
        - Requer WinRM configurado
        - Requer CredSSP para algumas operações

    Enable-MaintenanceMode
        Ativa modo de manutenção no nginx
        - Cria maintenance.flag
        - Reinicia nginx para mostrar página de manutenção

    Disable-MaintenanceMode
        Desativa modo de manutenção no nginx
        - Remove maintenance.flag
        - Reinicia nginx para voltar ao normal

    Stop-BackendProcess
        Para todos os processos do backend (Python)
        - Enumera processos
        - Termina processos
        - Verifica que pararam

    Start-BackendProcess
        Inicia o backend via script start.bat
        - Suporta janela visível ou hidden (ShowBackendWindow config)
        - Verifica que processo iniciou
        - Log de PID e Session ID

.CONFIGURATION
    Configurações necessárias em DeployConfig.ps1:

    $Global:DeployConfig.ServerIP = "172.16.2.35"
    $Global:DeployConfig.Usuario = "dominio\usuario"
    $Global:DeployConfig.PasswordFile = "caminho\para\senha.txt"

    $Global:DeployConfig.RemoteManagement = @{
        BackendProcessName = "python"
        BackendStartScriptPath = "D:\APP\NewAPP\backend\start.bat"
        ShowBackendWindow = $true  # $true=debug, $false=produção
    }

.REQUIREMENTS
    CLIENTE:
    - Windows PowerShell 5.1+
    - Acesso SMB ao servidor (porta 445)
    - Credenciais com permissões para criar/executar Scheduled Tasks

    SERVIDOR:
    - Task Scheduler service ativo (padrão Windows)
    - Compartilhamento SMB: \\172.16.2.35\app
    - Nginx em: D:\APP\NewAPP\nginx\
    - Backend em: D:\APP\NewAPP\backend\

.NOTES
    VANTAGENS DA ABORDAGEM TASK SCHEDULER (v2.0):
    ✅ Não requer WinRM configurado
    ✅ Não requer CredSSP ou Group Policy
    ✅ Usa apenas SMB (porta 445) que já está disponível
    ✅ Logs salvos em arquivo (fácil debug)
    ✅ Mais confiável (menos dependências)

    COMPARAÇÃO COM WINRM (v1.0):
    | Aspecto          | Task Scheduler | WinRM        |
    |------------------|----------------|--------------|
    | Configuração     | Simples        | Complexa     |
    | Porta necessária | 445 (SMB)      | 5985/5986    |
    | Delegação        | Não requerida  | CredSSP      |
    | Logs             | Arquivo        | Event Viewer |
    | Debug            | Fácil          | Difícil      |

.EXAMPLE
    # Ativar modo de manutenção
    Enable-MaintenanceMode

.EXAMPLE
    # Parar backend
    Stop-BackendProcess

.EXAMPLE
    # Iniciar backend com janela visível (debug)
    $Global:DeployConfig.RemoteManagement.ShowBackendWindow = $true
    Start-BackendProcess

.EXAMPLE
    # Executar comando customizado
    Invoke-RemoteServerCommand -OperationName "Listar processos" -ScriptBlock {
        Get-Process | Select-Object Name, Id, SessionId
    }

.LINK
    README.md - Documentação completa
    CHANGELOG.md - Histórico de versões
    TROUBLESHOOTING-EXECUCAO-REMOTA.md - Guia de troubleshooting
#>

# ============================================================================
# CONFIGURAÇÃO DE MODO DE EXECUÇÃO
# ============================================================================

# Método de execução remota:
# - $false (PADRÃO v2.0) -> Task Scheduler via schtasks (recomendado)
# - $true (LEGACY v1.0)  -> WinRM via Invoke-Command (requer configuração)
$Global:UseWinRM = $false

function Invoke-RemoteServerCommand {
    param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$ScriptBlock,
        [string]$OperationName,
        [array]$ArgumentList = @()
    )

    Write-DeployInfo "Executando comando remoto: $OperationName" "REMOTE_MGMT"

    if ($Global:UseWinRM) {
        return Invoke-RemoteServerCommand-WinRM -ScriptBlock $ScriptBlock -OperationName $OperationName -ArgumentList $ArgumentList
    } else {
        return Invoke-RemoteServerCommand-TaskScheduler -ScriptBlock $ScriptBlock -OperationName $OperationName -ArgumentList $ArgumentList
    }
}

function Invoke-RemoteServerCommand-WinRM {
    param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$ScriptBlock,
        [string]$OperationName,
        [array]$ArgumentList = @()
    )

    Write-DeployDebug "Usando WinRM para execução remota" "REMOTE_MGMT"

    # Obter método de autenticação da configuração (padrão: Negotiate)
    $authMethod = if ($Global:DeployConfig.RemoteManagement.UseCredSSP) { 'Credssp' } else { 'Negotiate' }

    Write-DeployDebug "Método de autenticação: $authMethod" "REMOTE_MGMT"

    try {
        $sessionParams = @{
            ComputerName = $Global:DeployConfig.ServerIP
            Credential = Get-DeployCredential
            Port = 5985 # Porta padrão do WinRM sobre HTTP
            Authentication = $authMethod
        }

        # Criar opções de sessão para aumentar o timeout
        $sessionOptions = New-PSSessionOption -OperationTimeout 0 -IdleTimeout 7200000 # 2 horas

        Invoke-Command @sessionParams -SessionOption $sessionOptions -ScriptBlock $ScriptBlock -ArgumentList $ArgumentList -ErrorAction Stop
        Write-DeployInfo "Comando remoto '$OperationName' executado com sucesso." "REMOTE_MGMT"
        return $true
    }
    catch {
        Write-DeployError "Falha ao executar comando remoto '$OperationName': $($_.Exception.Message)" "REMOTE_MGMT"

        # Se falhar com CredSSP, sugerir desabilitar
        if ($authMethod -eq 'Credssp' -and $_.Exception.Message -match "CredSSP|delegação") {
            Write-DeployError "" "REMOTE_MGMT"
            Write-DeployError "SUGESTÃO: Execute o script 'Setup-CredSSP.ps1' como Administrador" "REMOTE_MGMT"
            Write-DeployError "OU desabilite CredSSP no arquivo DeployConfig.ps1 definindo:" "REMOTE_MGMT"
            Write-DeployError "`$Global:DeployConfig.RemoteManagement.UseCredSSP = `$false" "REMOTE_MGMT"
            Write-DeployError "" "REMOTE_MGMT"
        }

        Write-DeployException $_.Exception "Invoke-RemoteServerCommand" "REMOTE_MGMT"
        return $false
    }
}

function Invoke-RemoteServerCommand-TaskScheduler {
    param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$ScriptBlock,
        [string]$OperationName,
        [array]$ArgumentList = @()
    )

    Write-DeployDebug "Usando Task Scheduler para execução remota (sem WinRM)" "REMOTE_MGMT"

    try {
        # Criar um nome único para a tarefa
        $taskName = "DeployTask_$(Get-Date -Format 'yyyyMMddHHmmss')"
        $serverIP = $Global:DeployConfig.ServerIP
        $credential = Get-DeployCredential

        # Converter o ScriptBlock para string e criar um script temporário
        $scriptContent = $ScriptBlock.ToString()

        # IMPORTANTE: Remover declaração param() do scriptblock se existir
        # porque vamos usar $args em vez disso
        $scriptContent = $scriptContent -replace '^\s*param\s*\([^\)]*\)\s*', ''

        # IMPORTANTE: Adicionar os argumentos ao script e logging
        $logPath = "D:\APP\NewAPP\deploy_log_$taskName.txt"
        $scriptWrapper = @"
# Script de deployment executado via Task Scheduler
# Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Operação: $OperationName

`$ErrorActionPreference = 'Continue'
`$logFile = "$logPath"

function Write-Log {
    param([string]`$message)
    `$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "`[`$timestamp`] `$message" | Out-File -FilePath `$logFile -Append -Encoding UTF8
    Write-Host `$message
}

Write-Log "=== Iniciando: $OperationName ==="
Write-Log "Computador: `$env:COMPUTERNAME"
Write-Log "Usuário: `$env:USERNAME"

"@

        if ($ArgumentList -and $ArgumentList.Count -gt 0) {
            # Construir array de argumentos para passar ao script
            $scriptWrapper += "`$args = @(`n"
            $argIndex = 0
            foreach ($arg in $ArgumentList) {
                # Escapar aspas no argumento
                $escapedArg = $arg -replace '"', '\"'
                $scriptWrapper += "    `"$escapedArg`"`n"
                $scriptWrapper += "Write-Log `"Argumento $argIndex : $escapedArg`"`n"
                $argIndex++
            }
            $scriptWrapper += ")`n`n"
        }

        # Envolver o scriptblock em try-catch para capturar erros
        $scriptWrapper += @"
try {
    Write-Log "Executando scriptblock..."

    $scriptContent

    Write-Log "=== Concluído com SUCESSO ==="
    exit 0
} catch {
    Write-Log "=== ERRO: `$(`$_.Exception.Message) ==="
    Write-Log "StackTrace: `$(`$_.ScriptStackTrace)"
    exit 1
}
"@

        $scriptContent = $scriptWrapper

        # Criar script temporário no compartilhamento de rede
        $tempScriptPath = "\\$serverIP\app\NewAPP\temp_deploy_script_$taskName.ps1"
        $tempScriptLocalPath = "D:\APP\NewAPP\temp_deploy_script_$taskName.ps1"

        Write-DeployDebug "Criando script temporário: $tempScriptPath" "REMOTE_MGMT"
        Set-Content -Path $tempScriptPath -Value $scriptContent -Encoding UTF8 -Force

        # Criar tarefa agendada no servidor remoto
        $taskAction = "powershell.exe -ExecutionPolicy Bypass -File `"$tempScriptLocalPath`""

        Write-DeployDebug "Criando tarefa agendada no servidor: $taskName" "REMOTE_MGMT"

        $username = $credential.UserName
        $password = $credential.GetNetworkCredential().Password

        # Usar horário válido (daqui a 2 minutos)
        $startTime = (Get-Date).AddMinutes(2).ToString("HH:mm")

        # Criar tarefa que executa em horário futuro próximo
        # Usar array de argumentos para evitar problemas com aspas
        $schtasksArgs = @(
            "/Create"
            "/S", $serverIP
            "/U", $username
            "/P", $password
            "/TN", $taskName
            "/TR", $taskAction
            "/SC", "ONCE"
            "/ST", $startTime
            "/RU", $username
            "/RP", $password
            "/F"
        )

        $createResult = & schtasks $schtasksArgs 2>&1
        $exitCode = $LASTEXITCODE

        if ($exitCode -ne 0) {
            throw "Falha ao criar tarefa agendada (Exit code: $exitCode): $createResult"
        }

        Write-DeployDebug "Executando tarefa agendada..." "REMOTE_MGMT"

        # Executar tarefa imediatamente
        $runTaskCmd = "schtasks /Run /S $serverIP /U `"$username`" /P `"$password`" /TN `"$taskName`""
        $runResult = Invoke-Expression $runTaskCmd 2>&1

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao executar tarefa: $runResult"
        }

        # Aguardar um pouco para a tarefa executar
        Start-Sleep -Seconds 3

        # Verificar status da tarefa
        $queryTaskCmd = "schtasks /Query /S $serverIP /U `"$username`" /P `"$password`" /TN `"$taskName`" /FO LIST /V"
        $queryResult = Invoke-Expression $queryTaskCmd 2>&1

        Write-DeployDebug "Status da tarefa: $queryResult" "REMOTE_MGMT"

        # Limpar: remover tarefa
        Start-Sleep -Seconds 2
        $deleteTaskCmd = "schtasks /Delete /S $serverIP /U `"$username`" /P `"$password`" /TN `"$taskName`" /F"
        Invoke-Expression $deleteTaskCmd 2>&1 | Out-Null

        # Limpar: remover script temporário
        try {
            Remove-Item -Path $tempScriptPath -Force -ErrorAction SilentlyContinue
        } catch {}

        Write-DeployInfo "Comando remoto '$OperationName' executado com sucesso via Task Scheduler." "REMOTE_MGMT"
        return $true
    }
    catch {
        Write-DeployError "Falha ao executar comando remoto '$OperationName' via Task Scheduler: $($_.Exception.Message)" "REMOTE_MGMT"
        Write-DeployException $_.Exception "Invoke-RemoteServerCommand-TaskScheduler" "REMOTE_MGMT"

        # Tentar limpar em caso de erro
        try {
            if ($tempScriptPath -and (Test-Path $tempScriptPath)) {
                Remove-Item -Path $tempScriptPath -Force -ErrorAction SilentlyContinue
            }
        } catch {}

        return $false
    }
}

function Enable-MaintenanceMode {
    return Invoke-RemoteServerCommand -OperationName "Ativar Modo Manutenção" -ScriptBlock {
        Write-Host "=== ATIVANDO MODO DE MANUTENÇÃO ==="

        # Criar o arquivo flag de manutenção
        $flagPath = "D:\APP\NewAPP\nginx\maintenance.flag"
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "Site em manutenção ativado em $timestamp" | Out-File -FilePath $flagPath -Force
        Write-Host "[OK] Flag de manutenção criado: $flagPath"

        # Parar nginx
        Write-Host "Parando nginx..."
        $nginxProcesses = Get-Process -Name nginx -ErrorAction SilentlyContinue
        if ($nginxProcesses) {
            Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Nginx parado ($($nginxProcesses.Count) processos)"
        } else {
            Write-Host "[INFO] Nginx já estava parado"
        }

        # Aguardar 2 segundos
        Start-Sleep -Seconds 2

        # Reiniciar nginx
        Write-Host "Reiniciando nginx..."
        $nginxPath = "D:\APP\NewAPP\nginx\nginx.exe"
        if (Test-Path $nginxPath) {
            Start-Process -FilePath $nginxPath -WorkingDirectory "D:\APP\NewAPP\nginx" -WindowStyle Hidden
            Start-Sleep -Seconds 2

            # Verificar se iniciou
            $nginxCheck = Get-Process -Name nginx -ErrorAction SilentlyContinue
            if ($nginxCheck) {
                Write-Host "[OK] Nginx reiniciado com sucesso ($($nginxCheck.Count) processos)"
            } else {
                Write-Host "[ERRO] Nginx não iniciou!"
            }
        } else {
            throw "Nginx.exe não encontrado em: $nginxPath"
        }

        Write-Host "=== MODO DE MANUTENÇÃO ATIVADO ==="
    }
}

function Disable-MaintenanceMode {
    return Invoke-RemoteServerCommand -OperationName "Desativar Modo Manutenção" -ScriptBlock {
        Write-Host "=== DESATIVANDO MODO DE MANUTENÇÃO ==="

        # Remover o arquivo flag de manutenção
        $flagPath = "D:\APP\NewAPP\nginx\maintenance.flag"
        if (Test-Path $flagPath) {
            Remove-Item -Path $flagPath -Force
            Write-Host "[OK] Flag de manutenção removido: $flagPath"
        } else {
            Write-Host "[INFO] Flag de manutenção já não existia"
        }

        # Parar nginx
        Write-Host "Parando nginx..."
        $nginxProcesses = Get-Process -Name nginx -ErrorAction SilentlyContinue
        if ($nginxProcesses) {
            Stop-Process -Name nginx -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Nginx parado ($($nginxProcesses.Count) processos)"
        } else {
            Write-Host "[INFO] Nginx já estava parado"
        }

        # Aguardar 2 segundos
        Start-Sleep -Seconds 2

        # Reiniciar nginx
        Write-Host "Reiniciando nginx..."
        $nginxPath = "D:\APP\NewAPP\nginx\nginx.exe"
        if (Test-Path $nginxPath) {
            Start-Process -FilePath $nginxPath -WorkingDirectory "D:\APP\NewAPP\nginx" -WindowStyle Hidden
            Start-Sleep -Seconds 2

            # Verificar se iniciou
            $nginxCheck = Get-Process -Name nginx -ErrorAction SilentlyContinue
            if ($nginxCheck) {
                Write-Host "[OK] Nginx reiniciado com sucesso ($($nginxCheck.Count) processos)"
            } else {
                Write-Host "[ERRO] Nginx não iniciou!"
            }
        } else {
            throw "Nginx.exe não encontrado em: $nginxPath"
        }

        Write-Host "=== MODO DE MANUTENÇÃO DESATIVADO ==="
    }
}

function Stop-BackendProcess {
    $processName = $Global:DeployConfig.RemoteManagement.BackendProcessName
    return Invoke-RemoteServerCommand -OperationName "Parar Processo Backend" -ScriptBlock {
        # $args[0] = nome do processo
        $name = $args[0]

        Write-Host "=== PARANDO BACKEND ==="
        $processes = Get-Process -Name $name -ErrorAction SilentlyContinue

        if ($processes) {
            Write-Host "Encontrados $($processes.Count) processo(s) '$name'"
            foreach ($proc in $processes) {
                Write-Host "  - Parando PID: $($proc.Id)..."
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }

            # Aguardar um pouco para os processos terminarem
            Start-Sleep -Seconds 2

            # Verificar se realmente pararam
            $remainingProcesses = Get-Process -Name $name -ErrorAction SilentlyContinue
            if ($remainingProcesses) {
                Write-Host "[AVISO] Ainda existem $($remainingProcesses.Count) processo(s) '$name' rodando"
            } else {
                Write-Host "[OK] Todos os processos '$name' foram parados com sucesso"
            }
        } else {
            Write-Host "[INFO] Nenhum processo '$name' encontrado. Já está parado."
        }

        Write-Host "=== BACKEND PARADO ==="
    } -ArgumentList $processName
}

function Start-BackendProcess {
    $startScript = $Global:DeployConfig.RemoteManagement.BackendStartScriptPath
    $showWindow = $Global:DeployConfig.RemoteManagement.ShowBackendWindow

    return Invoke-RemoteServerCommand -OperationName "Iniciar Processo Backend" -ScriptBlock {
        # $args[0] = path do script de start
        # $args[1] = mostrar janela (true/false)
        $script = $args[0]
        $showWindow = $args[1]

        if (-not (Test-Path $script)) {
            throw "Script de arranque do backend ('start.bat') não encontrado em: $script"
        }

        Write-Host "=== INICIANDO BACKEND ==="
        Write-Host "Executando: $script"
        $workingDir = Split-Path $script -Parent

        # Executar o script .bat para iniciar o backend
        if ($showWindow) {
            # COM JANELA VISÍVEL - Ideal para debug/desenvolvimento
            Write-Host "Modo: COM janela visível (debug)"
            Start-Process -FilePath $script -WorkingDirectory $workingDir -WindowStyle Normal
        } else {
            # SEM JANELA - Ideal para produção
            Write-Host "Modo: SEM janela (background/produção)"
            Start-Process -FilePath $script -WorkingDirectory $workingDir -WindowStyle Hidden
        }

        # Aguardar um pouco para o backend iniciar
        Write-Host "Aguardando backend iniciar..."
        Start-Sleep -Seconds 3

        # Verificar se o backend iniciou
        $pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue
        if ($pythonProcesses) {
            Write-Host "[OK] Backend iniciado com sucesso ($($pythonProcesses.Count) processos Python)"
            foreach ($proc in $pythonProcesses) {
                Write-Host "  - PID: $($proc.Id), Session: $($proc.SessionId)"
            }
        } else {
            Write-Host "[AVISO] Nenhum processo Python encontrado. O backend pode ainda estar iniciando..."
        }

        Write-Host "=== BACKEND INICIADO ==="
    } -ArgumentList @($startScript, $showWindow)
}