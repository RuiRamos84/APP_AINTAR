# Script Simples - Diagnostico do Servidor
# Configurar encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Configuracoes
$utilizador = "aintar\rui.ramos"
$pass = Get-Content "C:\Users\rui.ramos\Desktop\APP\PServ.txt" | ConvertTo-SecureString
$credencial = New-Object System.Management.Automation.PSCredential -ArgumentList $utilizador, $pass
$serverIP = "172.16.2.35"
$compartilhamento = "\\$serverIP\app"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    DIAGNOSTICO DO SERVIDOR - ESTRUTURA   " -ForegroundColor Cyan  
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Conectar ao servidor
Write-Host "A conectar ao servidor $compartilhamento..." -ForegroundColor Yellow

try {
    # Remover drive existente se houver
    if (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue) {
        Remove-PSDrive -Name "ServerDrive" -Force
    }
    
    # Criar novo drive
    New-PSDrive -Name "ServerDrive" -PSProvider FileSystem -Root $compartilhamento -Credential $credencial -ErrorAction Stop
    Write-Host "OK Conectado com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar estrutura
    Write-Host "ESTRUTURA DO SERVIDOR:" -ForegroundColor Yellow
    Write-Host "=====================" -ForegroundColor Yellow
    
    Write-Host "`nRoot (ServerDrive:):" -ForegroundColor White
    Get-ChildItem "ServerDrive:" | ForEach-Object {
        $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
        Write-Host "  $type $($_.Name)" -ForegroundColor Green
    }
    
    # Verificar NewAPP
    if (Test-Path "ServerDrive:NewAPP") {
        Write-Host "`nServerDrive:NewAPP:" -ForegroundColor White
        Get-ChildItem "ServerDrive:NewAPP" -ErrorAction SilentlyContinue | ForEach-Object {
            $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
            Write-Host "  $type $($_.Name)" -ForegroundColor Green
        }
        
        # Verificar nginx
        if (Test-Path "ServerDrive:NewAPP\nginx") {
            Write-Host "`nServerDrive:NewAPP\nginx:" -ForegroundColor White
            Get-ChildItem "ServerDrive:NewAPP\nginx" -ErrorAction SilentlyContinue | ForEach-Object {
                $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                Write-Host "  $type $($_.Name)" -ForegroundColor Green
            }
            
            # Verificar html se existir
            if (Test-Path "ServerDrive:NewAPP\nginx\html") {
                Write-Host "`nServerDrive:NewAPP\nginx\html:" -ForegroundColor White
                Get-ChildItem "ServerDrive:NewAPP\nginx\html" -ErrorAction SilentlyContinue | ForEach-Object {
                    $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                    Write-Host "  $type $($_.Name)" -ForegroundColor Green
                }
            } else {
                Write-Host "`nERRO: ServerDrive:NewAPP\nginx\html NAO EXISTE" -ForegroundColor Red
            }
        } else {
            Write-Host "`nERRO: ServerDrive:NewAPP\nginx NAO EXISTE" -ForegroundColor Red
        }
        
        # Verificar backend
        if (Test-Path "ServerDrive:NewAPP\backend") {
            Write-Host "`nServerDrive:NewAPP\backend:" -ForegroundColor White
            Get-ChildItem "ServerDrive:NewAPP\backend" -ErrorAction SilentlyContinue | ForEach-Object {
                $type = if ($_.PSIsContainer) { "[PASTA]" } else { "[FICHEIRO]" }
                Write-Host "  $type $($_.Name)" -ForegroundColor Green
            }
        } else {
            Write-Host "`nERRO: ServerDrive:NewAPP\backend NAO EXISTE" -ForegroundColor Red
        }
    } else {
        Write-Host "`nERRO: ServerDrive:NewAPP NAO EXISTE!" -ForegroundColor Red
    }
    
    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host "DIAGNOSTICO CONCLUIDO!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERRO ao conectar: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Fechar ligacao
    if (Get-PSDrive -Name "ServerDrive" -ErrorAction SilentlyContinue) {
        Remove-PSDrive -Name "ServerDrive" -Force
        Write-Host "`nLigacao fechada." -ForegroundColor Gray
    }
}

Write-Host "`nPrima Enter para sair..." -ForegroundColor Yellow
Read-Host