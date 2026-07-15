@echo off
echo.
echo *************************************************
echo *        ATIVA��O DO MODO DE MANUTEN��O         *
echo *************************************************
echo.

REM Criar o ficheiro flag
echo Site em manutencao ativado em %date% %time% > D:\APP\NewAPP\nginx\maintenance.flag
echo [OK] Ficheiro flag criado com sucesso.

REM Reiniciar o NGINX para aplicar as altera��es
echo.
echo A reiniciar o NGINX...
taskkill /F /IM nginx.exe /T >nul 2>&1
timeout /t 2 >nul
start "" "D:\APP\NewAPP\nginx\nginx.exe"
echo [OK] NGINX reiniciado com sucesso.

echo.
echo *************************************************
echo * MODO DE MANUTEN��O ATIVADO COM SUCESSO!       *
echo * O site agora mostra a p�gina de manuten��o.   *
echo *************************************************
echo.

@REM pause
