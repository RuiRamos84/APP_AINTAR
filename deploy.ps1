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
$caminhoRemotoFrontend = "$caminhoRemotoApp\frontend"
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

    # Verificar se o web.config já existe
    $webConfigPath = "$caminhoRemotoFrontend\web.config"
    if (!(Test-Path $webConfigPath)) {
        # Criar e configurar o web.config para o frontend apenas se não existir
        $webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@

        $webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8
        Write-Host "O arquivo web.config foi criado com sucesso!"
    } else {
        Write-Host "O arquivo web.config já existe. Nenhuma alteração foi feita."
    }

} catch {
    Write-Host "Erro durante a exportação: $($_.Exception.Message)"
} finally {
    Remove-PSDrive -Name "ServerDrive"
}