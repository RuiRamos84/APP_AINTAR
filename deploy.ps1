# Navegar para o diretório do projeto
Set-Location -Path "C:\Users\rui.ramos\Desktop\APP\frontend"

# Construir o projeto
npm run build

# Definir as variáveis
$utilizador = "aintar\rui.ramos"
$pass = Get-Content "C:\Users\rui.ramos\Desktop\APP\PServ.txt" | ConvertTo-SecureString
$credencial = New-Object System.Management.Automation.PSCredential -ArgumentList $utilizador, $pass
$serverIP = "172.16.2.35"
$compartilhamentoNome = "app" # Nome do compartilhamento no servidor
$compartilhamento = "\\$serverIP\$compartilhamentoNome"
$caminhoLocalFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend\build"
$caminhoLocalBackend = "C:\Users\rui.ramos\Desktop\APP\backend"
$caminhoRemotoApp = "ServerDrive:NewAPP"
$caminhoRemotoFrontend = "$caminhoRemotoApp\nginx\html\react-app\build"  # Novo caminho do frontend
$caminhoRemotoBackend = "$caminhoRemotoApp\backend"

# Montar o compartilhamento de rede com as credenciais
New-PSDrive -Name "ServerDrive" -PSProvider FileSystem -Root $compartilhamento -Credential $credencial

try {
    # Copiar a pasta de build do frontend para o servidor remoto
    if (Test-Path $caminhoRemotoFrontend) {
        Remove-Item -Path $caminhoRemotoFrontend -Recurse -Force
    }
    Copy-Item -Path $caminhoLocalFrontend -Destination $caminhoRemotoFrontend -Recurse -Force

    Write-Host "A exportação do frontend foi concluída com sucesso!"

    # Copiar a pasta do backend para o servidor remoto, mantendo a estrutura e ignorando 'venv' e '__pycache__'
    if (!(Test-Path $caminhoRemotoBackend)) {
        New-Item -Path $caminhoRemotoBackend -ItemType Directory -Force | Out-Null
    }

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

    Write-Host "A exportação do backend foi concluída com sucesso!"

    # Verificar se o nginx.conf já existe
    $nginxConfigPath = "$caminhoRemotoApp\nginx\conf\nginx.conf"
    if (!(Test-Path $nginxConfigPath)) {
        # Criar e configurar o nginx.conf para o NGINX
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

        # Redirecionar HTTP do IP para o domínio
        server {
            listen 80;
            server_name 83.240.148.114;
            return 301 https://app.aintar.pt$request_uri;
        }

        # Redirecionar HTTPS do IP para o domínio
        server {
            listen 443 ssl;
            server_name 83.240.148.114;

            ssl_certificate D:/APP/NewAPP/nginx/ssl/app.aintar.pt.crt;
            ssl_certificate_key D:/APP/NewAPP/nginx/ssl/app.aintar.pt.key;

            return 301 https://app.aintar.pt$request_uri;
        }

        # Configuração do servidor HTTP (redireciona para HTTPS)
        server {
            listen 80;
            server_name app.aintar.pt;
            return 301 https://$host$request_uri;
        }

        # Configuração do servidor HTTPS
        server {
        listen 443 ssl;
        server_name app.aintar.pt;

        ssl_certificate D:/APP/NewAPP/nginx/ssl/app.aintar.pt.crt;
        ssl_certificate_key D:/APP/NewAPP/nginx/ssl/app.aintar.pt.key;

        root D:/APP/NewAPP/nginx/html/react-app/build;
        index index.html;

        location / {
            try_files $uri /index.html;
        }

        location /api/v1/ {
            proxy_pass http://127.0.0.1:5000/api/v1/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/v1/files/ {
            proxy_pass http://127.0.0.1:5000/api/v1/files/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    }
    }
"@

        $nginxConfigContent | Out-File -FilePath $nginxConfigPath -Encoding UTF8
        Write-Host "O arquivo nginx.conf foi criado com sucesso!"
    } else {
        Write-Host "O arquivo nginx.conf já existe. Nenhuma alteração foi feita."
    }

    # Recarregar o NGINX após o deploy
    # Write-Host "Recarregando o NGINX..."
    # Invoke-Command -ComputerName $serverIP -Credential $credencial -ScriptBlock {
    #     nginx -s reload
    # }

    # Write-Host "O NGINX foi recarregado com sucesso!"

} catch {
    Write-Host "Erro durante a exportação: $($_.Exception.Message)"
} finally {
    Remove-PSDrive -Name "ServerDrive"
}