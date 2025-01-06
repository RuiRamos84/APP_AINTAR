@echo off
REM Caminho para o script de inicialização
set SERVER_SCRIPT=D:\APP\NewAPP\backend\start.bat

REM Parar o servidor (encontre e mate o processo do Python)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /pid %%a /f

REM Aguardar alguns segundos para garantir que o processo foi terminado
timeout /t 5 /nobreak

REM Iniciar o servidor novamente
start "" %SERVER_SCRIPT%
