@echo off
REM Mudar para a unidade D:
D:

REM Navegar at� o diret�rio do backend
cd \APP\NewAPP\backend\

REM Ativar o ambiente virtual
call venv\Scripts\activate

REM Definir a vari�vel de ambiente FLASK_ENV como produ��o
set FLASK_ENV=production

REM Iniciar a aplica��o Flask
python run_waitress.py

REM Manter a janela aberta ap�s o script terminar (opcional)
pause
