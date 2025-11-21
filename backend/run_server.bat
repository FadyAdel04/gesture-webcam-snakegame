@echo off
REM Activate virtual environment and run server
cd /d "%~dp0\.."
call venv_cv\Scripts\activate.bat
cd backend
python server.py
pause



