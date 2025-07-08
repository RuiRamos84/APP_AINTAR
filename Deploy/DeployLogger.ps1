# DeployLogger.ps1
# Sistema de logging centralizado
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# ENUMERAÇÃO DE NÍVEIS DE LOG
# ============================================================================

enum LogLevel {
    Debug = 0
    Info = 1
    Warning = 2
    Error = 3
    Critical = 4
}

# ============================================================================
# CLASSE DE LOGGING
# ============================================================================

class DeployLogger {
    [string]$LogFile
    [LogLevel]$MinLevel
    [bool]$ConsoleOutput
    [bool]$ColorOutput
    
    DeployLogger([string]$logFile, [LogLevel]$minLevel = [LogLevel]::Info, [bool]$consoleOutput = $true) {
        $this.LogFile = $logFile
        $this.MinLevel = $minLevel
        $this.ConsoleOutput = $consoleOutput
        $this.ColorOutput = $true
        
        # Criar diretório do log se não existir
        $logDir = Split-Path $logFile -Parent
        if (![string]::IsNullOrEmpty($logDir) -and !(Test-Path $logDir)) {
            New-Item -Path $logDir -ItemType Directory -Force | Out-Null
        }
        
        $this.WriteLog([LogLevel]::Info, "Sistema de logging iniciado", "SYSTEM")
    }
    
    [void] WriteLog([LogLevel]$level, [string]$message, [string]$component = "MAIN") {
        if ($level -lt $this.MinLevel) { return }
        
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $levelStr = $level.ToString().ToUpper().PadRight(8)
        $componentStr = $component.PadRight(12)
        $logEntry = "[$timestamp] [$levelStr] [$componentStr] $message"
        
        # Escrever no ficheiro
        try {
            Add-Content -Path $this.LogFile -Value $logEntry -ErrorAction SilentlyContinue
        }
        catch {
            # Se falhar, tentar escrever no console pelo menos
            if ($this.ConsoleOutput) {
                Write-Host "[LOG ERROR] Não foi possível escrever no ficheiro de log: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        # Escrever no console se habilitado
        if ($this.ConsoleOutput) {
            $this.WriteConsole($level, $message, $component, $timestamp)
        }
    }
    
    [void] WriteConsole([LogLevel]$level, [string]$message, [string]$component, [string]$timestamp) {
        if (-not $this.ColorOutput) {
            Write-Host "[$timestamp] [$($level.ToString().ToUpper())] [$component] $message"
            return
        }
        
        $color = switch ($level) {
            ([LogLevel]::Debug) { "Gray" }
            ([LogLevel]::Info) { "White" }
            ([LogLevel]::Warning) { "Yellow" }
            ([LogLevel]::Error) { "Red" }
            ([LogLevel]::Critical) { "Magenta" }
            default { "White" }
        }
        
        $prefix = switch ($level) {
            ([LogLevel]::Debug) { "[DEBUG]" }
            ([LogLevel]::Info) { "[INFO]" }
            ([LogLevel]::Warning) { "[WARN]" }
            ([LogLevel]::Error) { "[ERROR]" }
            ([LogLevel]::Critical) { "[CRIT]" }
            default { "[LOG]" }
        }
        
        Write-Host "$prefix " -ForegroundColor $color -NoNewline
        Write-Host "[$component] $message" -ForegroundColor $color
    }
    
    # Métodos de conveniência
    [void] Debug([string]$message, [string]$component = "MAIN") {
        $this.WriteLog([LogLevel]::Debug, $message, $component)
    }
    
    [void] Info([string]$message, [string]$component = "MAIN") {
        $this.WriteLog([LogLevel]::Info, $message, $component)
    }
    
    [void] Warning([string]$message, [string]$component = "MAIN") {
        $this.WriteLog([LogLevel]::Warning, $message, $component)
    }
    
    [void] Error([string]$message, [string]$component = "MAIN") {
        $this.WriteLog([LogLevel]::Error, $message, $component)
    }
    
    [void] Critical([string]$message, [string]$component = "MAIN") {
        $this.WriteLog([LogLevel]::Critical, $message, $component)
    }
    
    # Métodos para operações específicas
    [void] StartOperation([string]$operation, [string]$component = "MAIN") {
        $this.Info("Iniciando operação: $operation", $component)
    }
    
    [void] EndOperation([string]$operation, [bool]$success, [string]$component = "MAIN") {
        if ($success) {
            $this.Info("Operação concluída com sucesso: $operation", $component)
        } else {
            $this.Error("Operação falhou: $operation", $component)
        }
    }
    
    [void] Exception([System.Exception]$exception, [string]$context = "", [string]$component = "MAIN") {
        $message = if ([string]::IsNullOrEmpty($context)) {
            "Exceção: $($exception.Message)"
        } else {
            "Exceção em $context : $($exception.Message)"
        }
        
        $this.Error($message, $component)
        $this.Debug("Stack trace: $($exception.StackTrace)", $component)
    }
}

# ============================================================================
# INSTÂNCIA GLOBAL DO LOGGER
# ============================================================================

$Global:Logger = $null

function Initialize-Logger {
    param(
        [string]$LogFile = $Global:DeployConfig.LogFile,
        [LogLevel]$MinLevel = [LogLevel]::Info,
        [bool]$VerboseMode = $Global:DeployConfig.VerboseLogging
    )
    
    if ($VerboseMode) {
        $MinLevel = [LogLevel]::Debug
    }
    
    $Global:Logger = [DeployLogger]::new($LogFile, $MinLevel, $true)
    $Global:Logger.Info("Sistema de deployment inicializado", "SYSTEM")
}

# ============================================================================
# FUNÇÕES DE CONVENIÊNCIA GLOBAIS
# ============================================================================

function Write-DeployLog {
    param(
        [Parameter(Mandatory=$true)][string]$Message,
        [LogLevel]$Level = [LogLevel]::Info,
        [string]$Component = "MAIN"
    )
    
    if ($null -eq $Global:Logger) {
        Initialize-Logger
    }
    
    $Global:Logger.WriteLog($Level, $Message, $Component)
}

function Write-DeployDebug {
    param([string]$Message, [string]$Component = "MAIN")
    Write-DeployLog -Message $Message -Level ([LogLevel]::Debug) -Component $Component
}

function Write-DeployInfo {
    param([string]$Message, [string]$Component = "MAIN")
    Write-DeployLog -Message $Message -Level ([LogLevel]::Info) -Component $Component
}

function Write-DeployWarning {
    param([string]$Message, [string]$Component = "MAIN")
    Write-DeployLog -Message $Message -Level ([LogLevel]::Warning) -Component $Component
}

function Write-DeployError {
    param([string]$Message, [string]$Component = "MAIN")
    Write-DeployLog -Message $Message -Level ([LogLevel]::Error) -Component $Component
}

function Write-DeployException {
    param([System.Exception]$Exception, [string]$Context = "", [string]$Component = "MAIN")
    if ($null -ne $Global:Logger) {
        $Global:Logger.Exception($Exception, $Context, $Component)
    }
}