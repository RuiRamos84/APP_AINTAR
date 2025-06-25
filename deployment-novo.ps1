# Sistema de Deployment Inteligente - Aplicacao Web
# Autor: Assistente Claude
# Data: 2025
# Encoding: UTF-8

# Configurar encoding para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Configuracoes globais
$utilizador = "aintar\rui.ramos"
$pass = Get-Content "C:\Users\rui.ramos\Desktop\APP\PServ.txt" | ConvertTo-SecureString
$credencial = New-Object System.Management.Automation.PSCredential -ArgumentList $utilizador, $pass
$serverIP = "172.16.2.35"
$compartilhamentoNome = "app"
$compartilhamento = "\\$serverIP\$compartilhamentoNome"

# Caminhos locais
$caminhoLocalFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend\build"
$caminhoLocalBackend = "C:\Users\rui.ramos\Desktop\APP\backend"
$caminhoProjetoFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend"

# Caminhos remotos CORRIGIDOS - usar barra normal
$caminhoRemotoApp = "ServerDrive:\NewAPP"
$caminhoRemotoFrontend = "$caminhoRemotoApp\nginx\html\react-app\build"
$caminhoRemotoBackend = "$caminhoRemotoApp\backend"

# Funcao para mostrar o menu
function Show-Menu {
    Clear-Host
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "   SISTEMA DE DEPLOYMENT WEB APP  " -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Escolhe uma opcao:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. " -ForegroundColor Green -NoNewline
    Write-Host "Deployment Completo (Frontend + Backend + Configuracao Nginx)"
    Write-Host "2. " -ForegroundColor Green -NoNewline
    Write-Host "Deployment apenas do Frontend (com build)"
    Write-Host "3. " -ForegroundColor Green -NoNewline
    Write-Host "Deployment Frontend SEM BUILD (usar build existente)"
    Write-Host "4. " -ForegroundColor Green -NoNewline
    Write-Host "Deployment apenas do Backend"
    Write-Host "5. " -ForegroundColor Green -NoNewline
    Write-Host "Deployment Frontend + Backend (sem configuracao Nginx)"
    Write-Host "6. " -ForegroundColor Green -NoNewline
    Write-Host "Criar/Actualizar apenas configuracao Nginx"
    Write-Host "7. " -ForegroundColor Green -NoNewline
    Write-Host "Ver estado dos ficheiros (ultima modificacao)"
    Write-Host "8. " -ForegroundColor Blue -NoNewline
    Write-Host "DIAGNOSTICO - Ver estrutura do servidor"
    Write-Host "0. " -ForegroundColor Red -NoNewline
    Write-Host "Sair"
    Write-Host ""
}

# Funcao para montar o drive
function Mount-ServerDrive {
    try {
        # LOG: Verificar se ja existe e remover
        Write-Host "[LOG] Verificando se drive ServerDrive ja existe..." -ForegroundColor Magenta
        $existingDrive = Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue
        if ($existingDrive) {
            Write-Host "[LOG] Drive existente encontrado, removendo: $($existingDrive.Root)" -ForegroundColor Magenta
            Remove-PSDrive -Name "ServerDrive" -Force
            Write-Host "[LOG] Drive anterior removido com sucesso!" -ForegroundColor Magenta
        } else {
            Write-Host "[LOG] Nenhum drive anterior encontrado" -ForegroundColor Magenta
        }
        
        Write-Host "A conectar ao servidor..." -ForegroundColor Yellow
        Write-Host "[LOG] Tentando conectar a: $compartilhamento" -ForegroundColor Magenta
        Write-Host "[LOG] Utilizador: $utilizador" -ForegroundColor Magenta
        
        New-PSDrive -Name "ServerDrive" -PSProvider FileSystem -Root $compartilhamento -Credential $credencial -ErrorAction Stop
        
        # LOG: Verificar se a ligacao foi bem sucedida
        $newDrive = Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue
        if ($newDrive) {
            Write-Host "[LOG] Drive criado com sucesso: $($newDrive.Root)" -ForegroundColor Magenta
            Write-Host "[LOG] Testando acesso ao drive..." -ForegroundColor Magenta
            
            # Testar acesso listando conteudo
            try {
                $testContent = Get-ChildItem "ServerDrive:" -ErrorAction Stop | Select-Object -First 3
                Write-Host "[LOG] Teste de acesso bem sucedido! Primeiros itens:" -ForegroundColor Magenta
                $testContent | ForEach-Object { Write-Host "[LOG]   - $($_.Name)" -ForegroundColor Magenta }
            }
            catch {
                Write-Host "[LOG] ERRO no teste de acesso: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "[LOG] ERRO: Drive nao foi criado correctamente!" -ForegroundColor Red
            return $false
        }
        
        Write-Host "Conectado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[LOG] EXCECAO ao conectar: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "[LOG] Tipo de erro: $($_.Exception.GetType().FullName)" -ForegroundColor Red
        Write-Host "Erro ao conectar ao servidor: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcao para desmontar o drive
function Dismount-ServerDrive {
    try {
        if (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue) {
            Remove-PSDrive -Name "ServerDrive" -Force
            Write-Host "Ligacao fechada." -ForegroundColor Gray
        }
    }
    catch {
        # Ignorar erros ao desmontar
    }
}

# Funcao para construir o frontend
function Build-Frontend {
    Write-Host "A construir o frontend..." -ForegroundColor Yellow
    
    $currentLocation = Get-Location
    Set-Location -Path $caminhoProjetoFrontend
    
    try {
        $buildResult = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Construcao do frontend concluida com sucesso!" -ForegroundColor Green
            Set-Location -Path $currentLocation
            return $true
        } else {
            Write-Host "Erro na construcao do frontend:" -ForegroundColor Red
            Write-Host $buildResult -ForegroundColor Red
            Set-Location -Path $currentLocation
            return $false
        }
    }
    catch {
        Write-Host "Erro ao executar a construcao: $($_.Exception.Message)" -ForegroundColor Red
        Set-Location -Path $currentLocation
        return $false
    }
}

# Funcao para deployment do frontend (versao simplificada e robusta)
function Deploy-Frontend-Only {
    Write-Host "A copiar frontend para o servidor..." -ForegroundColor Yellow
    
    # Verificar build local
    if (-not (Test-Path $caminhoLocalFrontend)) {
        Write-Host "ERRO: Build local nao encontrado em $caminhoLocalFrontend" -ForegroundColor Red
        return $false
    }
    
    try {
        # Criar drive temporario directo
        $tempDriveName = "TempDeploy$(Get-Random)"
        New-PSDrive -Name $tempDriveName -PSProvider FileSystem -Root $compartilhamento -Credential $credencial -ErrorAction Stop | Out-Null
        
        $remotePathDirect = "${tempDriveName}:\NewAPP\nginx\html\react-app\build"
        $backupPathDirect = "${tempDriveName}:\NewAPP\nginx\html\react-app-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        
        # Backup se existe
        if (Test-Path $remotePathDirect) {
            Write-Host "A criar backup..." -ForegroundColor Yellow
            Move-Item $remotePathDirect $backupPathDirect
        }
        
        # Copiar
        Write-Host "A copiar ficheiros..." -ForegroundColor Yellow
        Copy-Item $caminhoLocalFrontend $remotePathDirect -Recurse -Force
        
        # Verificar
        if (Test-Path $remotePathDirect) {
            Write-Host "Deployment concluido com sucesso!" -ForegroundColor Green
            $result = $true
        } else {
            Write-Host "ERRO: Copia falhou" -ForegroundColor Red
            $result = $false
        }
        
        # Limpar
        Remove-PSDrive $tempDriveName -Force
        return $result
        
    }
    catch {
        Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
        try { Remove-PSDrive $tempDriveName -Force -ErrorAction SilentlyContinue } catch {}
        return $false
    }
}

# Funcao para deployment do backend
function Deploy-Backend {
    Write-Host "A iniciar deployment do backend..." -ForegroundColor Yellow
    
    # Verificar se o drive ainda existe
    if (-not (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue)) {
        Write-Host "Erro: Ligacao ao servidor perdida!" -ForegroundColor Red
        return $false
    }
    
    try {
        if (!(Test-Path $caminhoRemotoBackend)) {
            New-Item -Path $caminhoRemotoBackend -ItemType Directory -Force | Out-Null
        }

        Write-Host "A copiar ficheiros do backend (excluindo venv e __pycache__)..." -ForegroundColor Yellow
        
        Get-ChildItem -Path $caminhoLocalBackend -Recurse | Where-Object {
            $_.FullName -notlike "*\venv\*" -and 
            $_.Name -ne "venv" -and 
            $_.Name -ne "__pycache__" -and 
            $_.FullName -notlike "*\__pycache__\*"
        } | ForEach-Object {
            $targetPath = $_.FullName.Replace($caminhoLocalBackend, $caminhoRemotoBackend)
            if ($_.PSIsContainer) {
                if (!(Test-Path $targetPath)) {
                    New-Item -Path $targetPath -ItemType Directory -Force | Out-Null
                }
            } else {
                Copy-Item -Path $_.FullName -Destination $targetPath -Force | Out-Null
            }
        }

        Write-Host "Deployment do backend concluido com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Erro no deployment do backend: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcao para criar/actualizar configuracao nginx
function Deploy-NginxConfig {
    Write-Host "A verificar configuracao do Nginx..." -ForegroundColor Yellow
    
    # Verificar se o drive ainda existe
    if (-not (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue)) {
        Write-Host "Erro: Ligacao ao servidor perdida!" -ForegroundColor Red
        return $false
    }
    
    $nginxConfigPath = "$caminhoRemotoApp\nginx\conf\nginx.conf"
    
    if (Test-Path $nginxConfigPath) {
        $response = Read-Host "O ficheiro nginx.conf ja existe. Desejas substitui-lo? (s/N)"
        if ($response.ToLower() -ne 's' -and $response.ToLower() -ne 'sim') {
            Write-Host "Configuracao do Nginx mantida." -ForegroundColor Yellow
            return $true
        }
    }
    
    try {
        # Garantir que o directorio existe
        $nginxConfDir = Split-Path $nginxConfigPath -Parent
        if (!(Test-Path $nginxConfDir)) {
            New-Item -Path $nginxConfDir -ItemType Directory -Force | Out-Null
        }
        
        $nginxConfigContent = @"
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

    # Redirecionar HTTP do IP para o dominio
    server {
        listen 80;
        server_name 83.240.148.114;
        return 301 https://app.aintar.pt`$request_uri;
    }

    # Redirecionar HTTPS do IP para o dominio
    server {
        listen 443 ssl;
        server_name 83.240.148.114;

        ssl_certificate D:/APP/NewAPP/nginx/ssl/app.aintar.pt.crt;
        ssl_certificate_key D:/APP/NewAPP/nginx/ssl/app.aintar.pt.key;

        return 301 https://app.aintar.pt`$request_uri;
    }

    # Configuracao do servidor HTTP (redireciona para HTTPS)
    server {
        listen 80;
        server_name app.aintar.pt;
        return 301 https://`$host`$request_uri;
    }

    # Configuracao do servidor HTTPS
    server {
        listen 443 ssl;
        server_name app.aintar.pt;

        ssl_certificate D:/APP/NewAPP/nginx/ssl/app.aintar.pt.crt;
        ssl_certificate_key D:/APP/NewAPP/nginx/ssl/app.aintar.pt.key;

        root D:/APP/NewAPP/nginx/html/react-app/build;
        index index.html;

        location / {
            try_files `$uri /index.html;
        }

        location /api/v1/ {
            proxy_pass http://127.0.0.1:5000/api/v1/;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }

        location /api/v1/files/ {
            proxy_pass http://127.0.0.1:5000/api/v1/files/;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }

        location /socket.io/ {
            proxy_pass http://127.0.0.1:5000;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host `$host;
            proxy_cache_bypass `$http_upgrade;
            proxy_read_timeout 86400;
            proxy_buffering off;
            proxy_set_header Upgrade `$http_upgrade;
        }

        location = /api/v1/payments/webhook {
            proxy_pass http://127.0.0.1:5000/api/v1/payments/webhook;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        }
    }
}
"@

        $nginxConfigContent | Out-File -FilePath $nginxConfigPath -Encoding UTF8
        Write-Host "Configuracao do Nginx criada/actualizada com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Erro ao criar configuracao do Nginx: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcao para mostrar estado dos ficheiros
function Show-FileStatus {
    Write-Host "Estado dos ficheiros:" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
    # Frontend local
    if (Test-Path $caminhoLocalFrontend) {
        $frontendDate = (Get-ChildItem $caminhoLocalFrontend -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
        Write-Host "Frontend (construcao local): " -NoNewline
        Write-Host $frontendDate -ForegroundColor Green
    } else {
        Write-Host "Frontend (construcao local): " -NoNewline
        Write-Host "NAO EXISTE" -ForegroundColor Red
    }
    
    # Backend local
    if (Test-Path $caminhoLocalBackend) {
        $backendDate = (Get-ChildItem $caminhoLocalBackend -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
        Write-Host "Backend (local): " -NoNewline
        Write-Host $backendDate -ForegroundColor Green
    }
    
    # Verificar servidor com logica robusta
    Write-Host ""
    Write-Host "A verificar servidor..." -ForegroundColor Yellow
    
    try {
        # Limpar drives existentes
        Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue | Remove-PSDrive -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        
        # Criar drive
        New-PSDrive -Name "ServerDrive" -PSProvider FileSystem -Root $compartilhamento -Credential $credencial -ErrorAction Stop | Out-Null
        Start-Sleep -Seconds 1
        
        # Testar drive
        $testDrive = Get-PSDrive -Name "ServerDrive" -ErrorAction Stop
        Write-Host "Conectado ao servidor: $($testDrive.Root)" -ForegroundColor Green
        
        # Frontend remoto
        if (Test-Path $caminhoRemotoFrontend) {
            $remoteFrontendDate = (Get-ChildItem $caminhoRemotoFrontend -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
            if ($remoteFrontendDate) {
                Write-Host "Frontend (servidor): " -NoNewline
                Write-Host $remoteFrontendDate -ForegroundColor Green
            } else {
                Write-Host "Frontend (servidor): " -NoNewline
                Write-Host "PASTA VAZIA" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Frontend (servidor): " -NoNewline
            Write-Host "NAO EXISTE" -ForegroundColor Red
        }
        
        # Backend remoto
        if (Test-Path $caminhoRemotoBackend) {
            # Verificar apenas ficheiros na raiz para ser mais rapido
            $remoteBackendDate = (Get-ChildItem $caminhoRemotoBackend -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
            if ($remoteBackendDate) {
                Write-Host "Backend (servidor): " -NoNewline
                Write-Host $remoteBackendDate -ForegroundColor Green
            } else {
                Write-Host "Backend (servidor): " -NoNewline
                Write-Host "SEM FICHEIROS NA RAIZ" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Backend (servidor): " -NoNewline
            Write-Host "NAO EXISTE" -ForegroundColor Red
        }
        
        # Informacoes adicionais
        Write-Host ""
        Write-Host "Caminhos verificados:" -ForegroundColor Cyan
        Write-Host "Frontend: $caminhoRemotoFrontend" -ForegroundColor White
        Write-Host "Backend: $caminhoRemotoBackend" -ForegroundColor White
        
    }
    catch {
        Write-Host "ERRO ao conectar ao servidor: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        # Limpar drive
        Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue | Remove-PSDrive -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host ""
    Read-Host "Prima Enter para continuar"
}

# Funcao para executar deployment com gestao de ligacao
function Execute-WithConnection {
    param(
        [ScriptBlock]$Action,
        [string]$ActionName,
        [switch]$BuildFirst
    )
    
    Write-Host "A iniciar $ActionName..." -ForegroundColor Cyan
    
    # Se precisar de build primeiro, fazer antes de conectar
    if ($BuildFirst) {
        Write-Host "A fazer build antes de conectar ao servidor..." -ForegroundColor Yellow
        if (-not (Build-Frontend)) {
            Write-Host "$ActionName falhou no build!" -ForegroundColor Red
            Read-Host "Prima Enter para continuar"
            return
        }
        Write-Host "[LOG] Build concluido, a continuar com a ligacao..." -ForegroundColor Magenta
    }
    
    Write-Host "[LOG] A tentar estabelecer ligacao ao servidor..." -ForegroundColor Magenta
    if (Mount-ServerDrive) {
        Write-Host "[LOG] Ligacao estabelecida, a executar accao..." -ForegroundColor Magenta
        try {
            $result = & $Action
            
            if ($result) {
                Write-Host "$ActionName realizado com sucesso!" -ForegroundColor Green
            } else {
                Write-Host "$ActionName finalizado com alguns erros." -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "[LOG] EXCECAO durante execucao da accao: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "$ActionName falhou com erro: $($_.Exception.Message)" -ForegroundColor Red
        }
        finally {
            Write-Host "[LOG] A fechar ligacao ao servidor..." -ForegroundColor Magenta
            Dismount-ServerDrive
        }
    } else {
        Write-Host "[LOG] Falha ao estabelecer ligacao ao servidor!" -ForegroundColor Red
        Write-Host "$ActionName cancelado devido a falha na ligacao!" -ForegroundColor Red
    }
    
    Read-Host "Prima Enter para continuar"
}

# Loop principal
do {
    Show-Menu
    $opcao = Read-Host "Digite a opcao desejada"
    
    switch ($opcao) {
        "1" {
            Execute-WithConnection -ActionName "deployment completo" -BuildFirst -Action {
                $frontendOk = Deploy-Frontend-Only
                $backendOk = Deploy-Backend
                $nginxOk = Deploy-NginxConfig
                return ($frontendOk -and $backendOk -and $nginxOk)
            }
        }
        
        "2" {
            Execute-WithConnection -ActionName "deployment do frontend" -BuildFirst -Action {
                return Deploy-Frontend-Only
            }
        }
        
        "3" {
            Execute-WithConnection -ActionName "deployment frontend sem build" -Action {
                return Deploy-Frontend-Only
            }
        }
        
        "4" {
            Execute-WithConnection -ActionName "deployment do backend" -Action {
                return Deploy-Backend
            }
        }
        
        "5" {
            Execute-WithConnection -ActionName "deployment do frontend e backend" -BuildFirst -Action {
                $frontendOk = Deploy-Frontend-Only
                $backendOk = Deploy-Backend
                return ($frontendOk -and $backendOk)
            }
        }
        
        "6" {
            Execute-WithConnection -ActionName "actualizacao da configuracao do Nginx" -Action {
                return Deploy-NginxConfig
            }
        }
        
        "7" {
            Show-FileStatus
        }
        
        "8" {
            Write-Host "A diagnosticar estrutura do servidor..." -ForegroundColor Cyan
            
            # Tentar diagnostico com multiplas tentativas
            $maxTentativas = 3
            $tentativa = 1
            $diagnosticoOk = $false
            
            while ($tentativa -le $maxTentativas -and -not $diagnosticoOk) {
                Write-Host "[LOG] Tentativa $tentativa de $maxTentativas..." -ForegroundColor Magenta
                
                try {
                    # Limpar drives existentes
                    Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue | Remove-PSDrive -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 1
                    
                    # Criar drive
                    Write-Host "[LOG] Criando drive..." -ForegroundColor Magenta
                    New-PSDrive -Name "ServerDrive" -PSProvider FileSystem -Root $compartilhamento -Credential $credencial -ErrorAction Stop | Out-Null
                    
                    # Aguardar um pouco
                    Start-Sleep -Seconds 2
                    
                    # Verificar se funciona
                    Write-Host "[LOG] Testando drive..." -ForegroundColor Magenta
                    $testDrive = Get-PSDrive -Name "ServerDrive" -ErrorAction Stop
                    $testItems = Get-ChildItem "ServerDrive:" -ErrorAction Stop
                    
                    Write-Host "[DIAGNOSTICO] Estrutura do servidor:" -ForegroundColor Yellow
                    Write-Host "Root (ServerDrive:): $($testDrive.Root)" -ForegroundColor White
                    
                    $testItems | ForEach-Object {
                        $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                        Write-Host "  $type $($_.Name)" -ForegroundColor Green
                    }
                    
                    # Verificar NewAPP
                    if (Test-Path "ServerDrive:NewAPP") {
                        Write-Host "`nServerDrive:NewAPP:" -ForegroundColor White
                        Get-ChildItem "ServerDrive:NewAPP" -ErrorAction Stop | ForEach-Object {
                            $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                            Write-Host "  $type $($_.Name)" -ForegroundColor Green
                        }
                        
                        # Verificar nginx
                        if (Test-Path "ServerDrive:NewAPP\nginx") {
                            Write-Host "`nServerDrive:NewAPP\nginx:" -ForegroundColor White
                            Get-ChildItem "ServerDrive:NewAPP\nginx" -ErrorAction Stop | Select-Object -First 10 | ForEach-Object {
                                $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                                Write-Host "  $type $($_.Name)" -ForegroundColor Green
                            }
                            
                            # Verificar html
                            if (Test-Path "ServerDrive:NewAPP\nginx\html") {
                                Write-Host "`nServerDrive:NewAPP\nginx\html:" -ForegroundColor White
                                Get-ChildItem "ServerDrive:NewAPP\nginx\html" -ErrorAction Stop | ForEach-Object {
                                    $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                                    Write-Host "  $type $($_.Name)" -ForegroundColor Green
                                }
                                
                                # Verificar react-app
                                if (Test-Path "ServerDrive:NewAPP\nginx\html\react-app") {
                                    Write-Host "`nServerDrive:NewAPP\nginx\html\react-app:" -ForegroundColor White
                                    $reactAppItems = Get-ChildItem "ServerDrive:NewAPP\nginx\html\react-app" -ErrorAction Stop
                                    if ($reactAppItems.Count -gt 0) {
                                        $reactAppItems | Select-Object -First 8 | ForEach-Object {
                                            $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                                            Write-Host "  $type $($_.Name)" -ForegroundColor Green
                                        }
                                        if ($reactAppItems.Count -gt 8) {
                                            Write-Host "  ... e mais $($reactAppItems.Count - 8) itens" -ForegroundColor Gray
                                        }
                                    } else {
                                        Write-Host "  [VAZIO]" -ForegroundColor Yellow
                                    }
                                } else {
                                    Write-Host "`nINFO: react-app NAO EXISTE (normal se for primeiro deploy)" -ForegroundColor Yellow
                                }
                            }
                        }
                        
                        # Verificar backend
                        if (Test-Path "ServerDrive:NewAPP\backend") {
                            Write-Host "`nServerDrive:NewAPP\backend:" -ForegroundColor White
                            Get-ChildItem "ServerDrive:NewAPP\backend" -ErrorAction Stop | Select-Object -First 10 | ForEach-Object {
                                $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                                Write-Host "  $type $($_.Name)" -ForegroundColor Green
                            }
                        }
                    }
                    
                    # Mostrar informacoes finais
                    Write-Host "`n[DIAGNOSTICO] Informacoes dos caminhos:" -ForegroundColor Yellow
                    Write-Host "Frontend local: $caminhoLocalFrontend" -ForegroundColor White
                    Write-Host "Frontend remoto: $caminhoRemotoFrontend" -ForegroundColor White
                    Write-Host "Backend remoto: $caminhoRemotoBackend" -ForegroundColor White
                    Write-Host ""
                    Write-Host "Build local existe: $(Test-Path $caminhoLocalFrontend)" -ForegroundColor $(if (Test-Path $caminhoLocalFrontend) { "Green" } else { "Red" })
                    Write-Host "Frontend remoto existe: $(Test-Path $caminhoRemotoFrontend)" -ForegroundColor $(if (Test-Path $caminhoRemotoFrontend) { "Green" } else { "Yellow" })
                    Write-Host "Backend remoto existe: $(Test-Path $caminhoRemotoBackend)" -ForegroundColor $(if (Test-Path $caminhoRemotoBackend) { "Green" } else { "Red" })
                    
                    $diagnosticoOk = $true
                    Write-Host "`n[SUCESSO] Diagnostico concluido!" -ForegroundColor Green
                }
                catch {
                    Write-Host "[ERRO] Tentativa $tentativa falhou: $($_.Exception.Message)" -ForegroundColor Red
                    if ($tentativa -lt $maxTentativas) {
                        Write-Host "[LOG] A tentar novamente em 3 segundos..." -ForegroundColor Yellow
                        Start-Sleep -Seconds 3
                    }
                    $tentativa++
                }
                finally {
                    # Limpar drive
                    Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue | Remove-PSDrive -Force -ErrorAction SilentlyContinue
                }
            }
            
            if (-not $diagnosticoOk) {
                Write-Host "`n[FALHA] Nao foi possivel completar o diagnostico apos $maxTentativas tentativas!" -ForegroundColor Red
                Write-Host "Possivel problema de rede ou permissoes." -ForegroundColor Yellow
            }
            
            Read-Host "Prima Enter para continuar"
        }
        
        "0" {
            Write-Host "A sair..." -ForegroundColor Gray
            break
        }
        
        default {
            Write-Host "Opcao invalida! Prima Enter para tentar novamente." -ForegroundColor Red
            Read-Host
        }
    }
} while ($opcao -ne "0")

Write-Host "Deployment finalizado!" -ForegroundColor Green