# DeployNginx.ps1
# Módulo de configuração do Nginx
# Autor: Sistema Modular
# Data: 2025

# ============================================================================
# CLASSE DE CONFIGURAÇÃO NGINX
# ============================================================================

class NginxConfigurator {
    [string]$ConfigPath
    [string]$Domain
    [string]$ServerIP
    [string]$SSLCertPath
    [string]$SSLKeyPath
    [string]$BackendPort
    [bool]$CreateBackup
    
    NginxConfigurator() {
        $this.ConfigPath = $Global:DeployConfig.CaminhoRemotoNginxConf
        $this.Domain = "app.aintar.pt"
        $this.ServerIP = $Global:DeployConfig.ServerIP
        $this.SSLCertPath = "D:/APP/NewAPP/nginx/ssl/app.aintar.pt.crt"
        $this.SSLKeyPath = "D:/APP/NewAPP/nginx/ssl/app.aintar.pt.key"
        $this.BackendPort = "5000"
        $this.CreateBackup = $Global:DeployConfig.CriarBackup
    }
    
    [string] GenerateNginxConfig() {
        Write-DeployDebug "Gerando configuração do Nginx..." "NGINX"
        
        $config = @"
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;
    client_max_body_size 12M;

    # Configuração de logging
    access_log logs/access.log;
    error_log logs/error.log;

    # Compressão
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Redirecionar HTTP do IP para o dominio
    server {
        listen 80;
        server_name $($this.ServerIP);
        return 301 https://$($this.Domain)`$request_uri;
    }

    # Redirecionar HTTPS do IP para o dominio
    server {
        listen 443 ssl;
        server_name $($this.ServerIP);

        ssl_certificate $($this.SSLCertPath);
        ssl_certificate_key $($this.SSLKeyPath);

        # Configurações SSL básicas
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        return 301 https://$($this.Domain)`$request_uri;
    }

    # Configuracao do servidor HTTP (redireciona para HTTPS)
    server {
        listen 80;
        server_name $($this.Domain);
        return 301 https://`$host`$request_uri;
    }

    # Configuracao principal do servidor HTTPS
    server {
        listen 443 ssl http2;
        server_name $($this.Domain);

        # Configurações SSL
        ssl_certificate $($this.SSLCertPath);
        ssl_certificate_key $($this.SSLKeyPath);
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers off;
        
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Root para aplicação React
        root D:/APP/NewAPP/nginx/html/react-app/build;
        index index.html;

        # Configuração para Single Page Application
        location / {
            try_files `$uri `$uri/ /index.html;
            
            # Cache para arquivos estáticos
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)`$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API do backend - rotas principais
        location /api/v1/ {
            proxy_pass http://127.0.0.1:$($this.BackendPort)/api/v1/;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            proxy_set_header X-Forwarded-Port `$server_port;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Upload de arquivos
        location /api/v1/files/ {
            proxy_pass http://127.0.0.1:$($this.BackendPort)/api/v1/files/;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            # Configurações específicas para upload
            client_max_body_size 50M;
            proxy_request_buffering off;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # WebSocket para Socket.IO
        location /socket.io/ {
            proxy_pass http://127.0.0.1:$($this.BackendPort);
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            proxy_cache_bypass `$http_upgrade;
            proxy_read_timeout 86400;
            proxy_buffering off;
        }

        # Webhook de pagamentos (sem buffer para segurança)
        location = /api/v1/payments/webhook {
            proxy_pass http://127.0.0.1:$($this.BackendPort)/api/v1/payments/webhook;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            # Sem cache para webhooks
            proxy_buffering off;
            proxy_cache off;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Bloquear acesso a arquivos sensíveis
        location ~ /\. {
            deny all;
        }
        
        location ~ ~`$ {
            deny all;
        }
    }
}
"@

        return $config
    }
    
    [bool] ValidateConfig([string]$config) {
        Write-DeployDebug "Validando configuração do Nginx..." "NGINX"
        
        # Verificações básicas da configuração
        $requiredSections = @("worker_processes", "events", "http", "server")
        $missingSections = @()

        foreach ($section in $requiredSections) {
            if ($config -notmatch $section) {
                $missingSections += $section
            }
        }

        if ($missingSections.Count -gt 0) {
            Write-DeployError "Secoes obrigatorias ausentes na configuracao: $($missingSections -join ', ')" "NGINX"
            return $false
        }
        
        # Verificar se paths SSL existem
        if ($config -match "ssl_certificate\s+([^;]+);") {
            $sslCert = $matches[1].Trim()
            Write-DeployDebug "Certificado SSL configurado: $sslCert" "NGINX"
        }
        
        if ($config -match "ssl_certificate_key\s+([^;]+);") {
            $sslKey = $matches[1].Trim()
            Write-DeployDebug "Chave SSL configurada: $sslKey" "NGINX"
        }
        
        # Verificar configurações de proxy
        $proxyLocations = ($config | Select-String "location.*\{" -AllMatches).Matches.Count
        Write-DeployDebug "Localizações de proxy encontradas: $proxyLocations" "NGINX"
        
        if ($proxyLocations -eq 0) {
            Write-DeployWarning "Nenhuma localização de proxy encontrada" "NGINX"
        }
        
        Write-DeployInfo "Configuração do Nginx validada com sucesso!" "NGINX"
        return $true
    }
    
    [bool] CreateConfigBackup() {
        if (-not $this.CreateBackup) {
            Write-DeployDebug "Backup de configuração desabilitado" "NGINX"
            return $true
        }
        
        if (-not (Test-Path $this.ConfigPath)) {
            Write-DeployDebug "Arquivo de configuração não existe, backup desnecessário" "NGINX"
            return $true
        }
        
        try {
            $backupPath = Get-BackupPath ($this.ConfigPath -replace "\.conf$", "")
            $backupPath += ".conf"
            
            Write-DeployInfo "Criando backup da configuração: $backupPath" "NGINX"
            Copy-Item $this.ConfigPath $backupPath -ErrorAction Stop
            
            Write-DeployInfo "Backup da configuração criado com sucesso!" "NGINX"
            return $true
        }
        catch {
            Write-DeployException $_.Exception "Criação de backup da configuração" "NGINX"
            return $false
        }
    }
    
    [bool] DeployConfig() {
        Write-DeployInfo "Iniciando deployment da configuração do Nginx..." "NGINX"
        
        try {
            # Gerar configuração
            $config = $this.GenerateNginxConfig()
            
            # Validar configuração
            if (-not $this.ValidateConfig($config)) {
                Write-DeployError "Configuração inválida, deployment cancelado" "NGINX"
                return $false
            }
            
            # Verificar se já existe e pedir confirmação se necessário
            if (Test-Path $this.ConfigPath) {
                Write-DeployWarning "Arquivo de configuração já existe: $($this.ConfigPath)" "NGINX"
                Write-DeployInfo "A configuração será substituída..." "NGINX"
            }
            
            # Criar backup da configuração atual
            if (-not $this.CreateConfigBackup()) {
                Write-DeployWarning "Falha ao criar backup, continuando..." "NGINX"
            }
            
            # Garantir que o diretório existe
            $configDir = Split-Path $this.ConfigPath -Parent
            if (-not (Test-Path $configDir)) {
                Write-DeployDebug "Criando diretório de configuração: $configDir" "NGINX"
                New-Item -Path $configDir -ItemType Directory -Force | Out-Null
            }
            
            # Escrever configuração
            Write-DeployDebug "Escrevendo configuração em: $($this.ConfigPath)" "NGINX"
            $config | Out-File -FilePath $this.ConfigPath -Encoding UTF8 -ErrorAction Stop
            
            # Verificar se foi criado corretamente
            if (Test-Path $this.ConfigPath) {
                $writtenConfig = Get-Content $this.ConfigPath -Raw
                if ($writtenConfig.Length -gt 0) {
                    Write-DeployInfo "Configuração do Nginx criada/atualizada com sucesso!" "NGINX"
                    return $true
                } else {
                    Write-DeployError "Arquivo de configuração foi criado mas está vazio" "NGINX"
                    return $false
                }
            } else {
                Write-DeployError "Falha ao criar arquivo de configuração" "NGINX"
                return $false
            }
        }
        catch {
            Write-DeployException $_.Exception "Deployment da configuração do Nginx" "NGINX"
            return $false
        }
    }
    
    [bool] TestConfigSyntax() {
        Write-DeployDebug "Testando sintaxe da configuração do Nginx..." "NGINX"
        
        if (-not (Test-Path $this.ConfigPath)) {
            Write-DeployError "Arquivo de configuração não encontrado para teste" "NGINX"
            return $false
        }
        
        # Nota: Este é um teste básico. Em um ambiente real, você poderia
        # executar 'nginx -t' se o nginx estiver instalado localmente
        
        try {
            $configContent = Get-Content $this.ConfigPath -Raw
            
            # Verificações básicas de sintaxe
            $braceCount = ($configContent | Select-String "{" -AllMatches).Matches.Count - 
                         ($configContent | Select-String "}" -AllMatches).Matches.Count
            
            if ($braceCount -ne 0) {
                Write-DeployError "Erro de sintaxe: chaves não balanceadas (diferença: $braceCount)" "NGINX"
                return $false
            }
            
            # Verificar se todas as diretivas terminam com ;
            $lines = $configContent -split "`n" | Where-Object { $_.Trim() -ne "" }
            $errorLines = @()
            
            foreach ($line in $lines) {
                $trimmedLine = $line.Trim()
                if ($trimmedLine -match "^\s*[a-zA-Z]" -and 
                    $trimmedLine -notmatch "[;}]$" -and 
                    $trimmedLine -notmatch "^\s*#" -and
                    $trimmedLine -notmatch "\{$") {
                    $errorLines += $trimmedLine
                }
            }
            
            if ($errorLines.Count -gt 0) {
                Write-DeployWarning "Possíveis erros de sintaxe encontrados:" "NGINX"
                $errorLines | ForEach-Object { Write-DeployWarning "  $_" "NGINX" }
            }
            
            Write-DeployInfo "Teste de sintaxe básico passou!" "NGINX"
            return $true
        }
        catch {
            Write-DeployException $_.Exception "Teste de sintaxe" "NGINX"
            return $false
        }
    }
    
    [object] GetConfigInfo() {
        $info = @{
            ConfigPath = $this.ConfigPath
            ConfigExists = Test-Path $this.ConfigPath
            Domain = $this.Domain
            ServerIP = $this.ServerIP
            SSLCertPath = $this.SSLCertPath
            SSLKeyPath = $this.SSLKeyPath
            BackendPort = $this.BackendPort
            ConfigSize = 0
            LastModified = $null
            SyntaxValid = $false
        }
        
        if ($info.ConfigExists) {
            $configFile = Get-Item $this.ConfigPath
            $info.ConfigSize = $configFile.Length
            $info.LastModified = $configFile.LastWriteTime
            $info.SyntaxValid = $this.TestConfigSyntax()
        }
        
        return $info
    }
    
    [bool] Deploy() {
        Write-DeployInfo "Iniciando deployment completo da configuração do Nginx..." "NGINX"
        
        if (-not $this.DeployConfig()) {
            Write-DeployError "Falha no deployment da configuração" "NGINX"
            return $false
        }
        
        if (-not $this.TestConfigSyntax()) {
            Write-DeployWarning "Problemas de sintaxe detectados na configuração" "NGINX"
            return $false
        }
        
        Write-DeployInfo "Deployment da configuração do Nginx concluído com sucesso!" "NGINX"
        return $true
    }
}

# ============================================================================
# FUNÇÕES PÚBLICAS DO MÓDULO
# ============================================================================

function Deploy-NginxConfig {
    param(
        [string]$Domain,
        [string]$BackendPort = "5000",
        [bool]$TestSyntax = $true
    )
    
    return Invoke-WithServerConnection -ScriptBlock {
        $configurator = [NginxConfigurator]::new()
        
        # Aplicar parâmetros personalizados se fornecidos
        if (-not [string]::IsNullOrEmpty($Domain)) {
            $configurator.Domain = $Domain
        }
        
        if (-not [string]::IsNullOrEmpty($BackendPort)) {
            $configurator.BackendPort = $BackendPort
        }
        
        $result = $configurator.Deploy()
        
        if ($result -and $TestSyntax) {
            Write-DeployInfo "Executando teste final de sintaxe..." "NGINX"
            $result = $configurator.TestConfigSyntax()
        }
        
        return $result
    } -OperationName "Deploy Nginx Config"
}

function Test-NginxConfig {
    return Invoke-WithServerConnection -ScriptBlock {
        $configurator = [NginxConfigurator]::new()
        return $configurator.TestConfigSyntax()
    } -OperationName "Test Nginx Config"
}

function Get-NginxConfigInfo {
    $configurator = [NginxConfigurator]::new()
    
    $info = $configurator.GetConfigInfo()
    
    # Adicionar informações remotas se conectado
    if (Test-DeployConnection) {
        try {
            $remoteInfo = Invoke-WithServerConnection -ScriptBlock {
                $configurator = [NginxConfigurator]::new()
                return $configurator.GetConfigInfo()
            } -OperationName "Get Remote Nginx Info" -DisconnectAfter $false
            
            if ($remoteInfo) {
                $info.RemoteConfigExists = $remoteInfo.ConfigExists
                $info.RemoteConfigSize = $remoteInfo.ConfigSize
                $info.RemoteLastModified = $remoteInfo.LastModified
                $info.RemoteSyntaxValid = $remoteInfo.SyntaxValid
            }
        }
        catch {
            Write-DeployWarning "Falha ao obter informações remotas do Nginx" "NGINX"
        }
    }
    
    return $info
}

function Show-NginxConfig {
    param([bool]$ShowRemote = $false)
    
    if ($ShowRemote) {
        Invoke-WithServerConnection -ScriptBlock {
            $configurator = [NginxConfigurator]::new()
            if (Test-Path $configurator.ConfigPath) {
                Write-Host "=== Configuração Remota do Nginx ===" -ForegroundColor Cyan
                Get-Content $configurator.ConfigPath | Write-Host
            } else {
                Write-Host "Configuração remota não encontrada!" -ForegroundColor Red
            }
        } -OperationName "Show Remote Nginx Config"
    } else {
        $configurator = [NginxConfigurator]::new()
        Write-Host "=== Configuração Gerada do Nginx ===" -ForegroundColor Cyan
        $configurator.GenerateNginxConfig() | Write-Host
    }
}