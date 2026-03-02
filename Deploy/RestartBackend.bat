@echo off
setlocal

set "SERVER_SCRIPT=D:\APP\NewAPP\backend\start.bat"
set "PROCESS_NAME=python.exe"

echo.
echo ==========================================
echo       RESTART BACKEND - AINTAR APP
echo ==========================================
echo.

REM --- 1. Parar processos Python ---
echo [1/2] A parar processos backend...
taskkill /im %PROCESS_NAME% /f >nul 2>&1
if %errorlevel% == 0 (
    echo       [OK] Processos %PROCESS_NAME% terminados.
) else (
    echo       [INFO] Nenhum processo %PROCESS_NAME% ativo.
)

echo       A aguardar 3 segundos...
timeout /t 3 /nobreak >nul

echo.

REM --- 2. Iniciar backend ---
echo [2/2] A iniciar backend...
echo       Script: %SERVER_SCRIPT%

if not exist "%SERVER_SCRIPT%" (
    echo       [ERRO] Script de arranque nao encontrado: %SERVER_SCRIPT%
    echo.
    exit /b 1
)

start "" "%SERVER_SCRIPT%"

echo       A aguardar 5 segundos para verificar arranque...
timeout /t 5 /nobreak >nul

REM Verificar se processo Python esta ativo
tasklist /fi "imagename eq %PROCESS_NAME%" /fo csv /nh 2>nul | find /i "python.exe" >nul
if %errorlevel% == 0 (
    echo       [OK] Backend a correr.
) else (
    echo       [AVISO] Processo Python nao detetado. Backend pode ainda estar a iniciar.
)

echo.
echo ==========================================
echo           RESTART CONCLUIDO
echo ==========================================
echo.

endlocal
