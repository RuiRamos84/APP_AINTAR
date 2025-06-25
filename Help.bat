@echo off
title Lembrete de Seguranca
color 0a
echo.
echo ===============================================
echo    LEMBRETE DE SEGURANCA ATIVADO!
echo ===============================================
echo.

set /a contador=6

:loop
if %contador% gtr 0 (
    cls
    echo.
    echo ===============================================
    echo         ATENCAO! COMPUTADOR DESBLOQUEADO!
    echo ===============================================
    echo.
    
    set /a escolha=%random% %%% 4 + 1
    if %escolha%==1 echo    Lembra-te sempre de bloquear o computador!
    if %escolha%==2 echo    Seguranca em primeiro lugar, colega!
    if %escolha%==3 echo    Um computador desbloqueado e perigoso!
    if %escolha%==4 echo    Proxima vez bloqueia o ecra, sim?
    
    echo.
    echo    Faltam %contador% vezes para terminar...
    echo.
    echo    Pressiona qualquer tecla para continuar...
    echo ===============================================
    pause >nul
    
    set /a contador-=1
    goto loop
) else (
    cls
    echo.
    echo ===============================================
    echo           MISSAO CUMPRIDA!
    echo ===============================================
    echo.
    echo    Muito bem! Agora ja sabes:
    echo    SEMPRE bloquear o computador quando te ausentas!
    echo.
    echo    Windows + L e o teu amigo!
    echo.
    echo ===============================================
    echo    Pressiona qualquer tecla para sair...
    pause >nul
)