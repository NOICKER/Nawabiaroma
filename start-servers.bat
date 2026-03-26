@echo off
title Aroma Launcher

echo ==================================================
echo Starting Nawabi Aroma Backend
echo Location: %~dp0
echo ==================================================

cd /d "%~dp0"

:: Check for node_modules and install if missing
if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
)

echo [1/2] Launching Backend Server...
start "Aroma Backend" cmd /k "npm run dev"

echo.
echo [2/2] Backend launched!
echo       Note: To start the Frontend, please open a separate terminal in your frontend folder and run 'npm start'.
echo.
pause
