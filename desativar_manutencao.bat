@echo off
echo.
echo *************************************************
echo *      DESATIVA��O DO MODO DE MANUTEN��O        *
echo *************************************************
echo.

REM Remover o ficheiro flag
del D:\APP\NewAPP\nginx\maintenance.flag
echo [OK] Ficheiro flag removido com sucesso.

REM Reiniciar o NGINX para aplicar as altera��es
echo.
echo A reiniciar o NGINX...
taskkill /F /IM nginx.exe /T >nul 2>&1
timeout /t 2 >nul
start "" "D:\APP\NewAPP\nginx\nginx.exe"
echo [OK] NGINX reiniciado com sucesso.

echo.
echo *************************************************
echo * MODO DE MANUTEN��O DESATIVADO COM SUCESSO!    *
echo * O site agora est� a funcionar normalmente.    *
echo *************************************************
echo.

@REM pause
