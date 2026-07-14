<#
.SYNOPSIS
    Cria (ou remove) a tarefa agendada do Windows para o verificador AIRC.
.DESCRIPTION
    Regista uma tarefa que corre verificar-airc.ps1 automaticamente como SYSTEM
    com privilegios elevados: verificacao + download + extraccao dos updates.

    A tarefa NUNCA instala nada - decisao deliberada: algumas versoes AIRC
    requerem update de base de dados e janela de manutencao, por isso a
    instalacao e sempre manual (.\verificar-airc.ps1 -Install, numa consola
    elevada, depois de ler o INSTALAR.txt gerado).

    Correr este script numa consola PowerShell elevada (Administrador).
.PARAMETER Hora
    Hora de execucao (formato HH:mm). Default: 07:30.
.PARAMETER DiaSemana
    Dia da semana para o trigger semanal. Default: Monday.
.PARAMETER Diaria
    Usa trigger diario (7 dias/semana) em vez de semanal.
.PARAMETER DiasUteis
    Usa trigger de segunda a sexta-feira. Tem prioridade sobre -Diaria.
.PARAMETER StagingDir
    Pasta onde os updates ficam descarregados/extraidos a espera de instalacao
    manual. Default: C:\AIRC_Updates. E criada com ACL apertado (so SYSTEM e
    Administradores escrevem) porque o conteudo sera executado com elevacao.
.PARAMETER Remover
    Remove a tarefa agendada e sai.
.EXAMPLE
    .\configurar-tarefa-agendada.ps1 -DiasUteis
    Tarefa de segunda a sexta as 07:30: verifica + descarrega + extrai.
.EXAMPLE
    .\configurar-tarefa-agendada.ps1
    Tarefa semanal (segunda, 07:30).
.EXAMPLE
    .\configurar-tarefa-agendada.ps1 -Diaria -Hora 06:00
    Tarefa diaria (7 dias) as 06:00.
.EXAMPLE
    .\configurar-tarefa-agendada.ps1 -Remover
#>

[CmdletBinding()]
param(
    [ValidatePattern('^\d{1,2}:\d{2}$')]
    [string]$Hora = '07:30',
    [ValidateSet('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')]
    [string]$DiaSemana = 'Monday',
    [switch]$Diaria,
    [switch]$DiasUteis,
    [string]$StagingDir = 'C:\AIRC_Updates',
    [switch]$Remover
)

$ErrorActionPreference = 'Stop'
$TaskName   = 'AIRC - Verificador de Versoes'
$ScriptPath = Join-Path $PSScriptRoot 'verificar-airc.ps1'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'ERRO: e preciso correr numa consola elevada (Administrador).' -ForegroundColor Red
    exit 1
}

if ($Remover) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host ("Tarefa '{0}' removida." -f $TaskName) -ForegroundColor Green
    } else {
        Write-Host ("Tarefa '{0}' nao existe - nada a remover." -f $TaskName) -ForegroundColor Yellow
    }
    exit 0
}

if (-not (Test-Path $ScriptPath)) {
    Write-Host ("ERRO: nao encontrei {0}" -f $ScriptPath) -ForegroundColor Red
    exit 1
}

# Pasta de staging: criada com ACL apertado (SYSTEM/Admins escrevem, Users
# leem) - o conteudo vai ser executado com elevacao, nao pode ser alteravel
# por utilizadores normais. SIDs em vez de nomes para funcionar em PT e EN.
if (-not (Test-Path $StagingDir)) {
    New-Item -Path $StagingDir -ItemType Directory -Force | Out-Null
}
icacls $StagingDir /inheritance:r /grant '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Null

# -CsvOnly mantem o historico CSV; -Unattended grava transcript em logs\
# Sem -Install por decisao: instalacao e sempre manual (ver .DESCRIPTION)
$argumentos = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -CsvOnly -Unattended -Extract -StagingDir `"$StagingDir`""

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentos -WorkingDirectory $PSScriptRoot

if ($DiasUteis) {
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $Hora
    $cadencia = "dias uteis (seg-sex) as $Hora"
} elseif ($Diaria) {
    $trigger = New-ScheduledTaskTrigger -Daily -At $Hora
    $cadencia = "diaria as $Hora"
} else {
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DiaSemana -At $Hora
    $cadencia = "semanal ($DiaSemana as $Hora)"
}

# SYSTEM: corre sem sessao iniciada e sem guardar password; RunLevel Highest
# porque a instalacao de software exige elevacao.
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

Write-Host ''
Write-Host ("Tarefa '{0}' criada." -f $TaskName) -ForegroundColor Green
Write-Host ("  Cadencia  : {0}" -f $cadencia) -ForegroundColor Gray
Write-Host '  Modo      : verificar + download + extrair (instalacao e sempre manual)' -ForegroundColor Gray
Write-Host ("  Updates   : {0} (limpeza automatica apos instalar)" -f $StagingDir) -ForegroundColor Gray
Write-Host ("  Historico : {0}" -f (Join-Path $PSScriptRoot 'relatorio-airc.csv')) -ForegroundColor Gray
Write-Host ("  Logs      : {0}" -f (Join-Path $PSScriptRoot 'logs')) -ForegroundColor Gray
Write-Host ''
Write-Host ("Quando houver updates em {0}, ler o INSTALAR.txt e correr o installer" -f $StagingDir) -ForegroundColor DarkGray
Write-Host 'extraido como administrador. Na verificacao seguinte, o que ja estiver' -ForegroundColor DarkGray
Write-Host 'instalado e removido do staging automaticamente.' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Testar ja com: Start-ScheduledTask -TaskName ''AIRC - Verificador de Versoes''' -ForegroundColor DarkGray
