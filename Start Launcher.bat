@echo off
setlocal enabledelayedexpansion
title Logic Simulator Studio – Launcher
echo.
echo  Logic Simulator Studio – Launcher
echo  Browser oeffnet sich automatisch auf http://localhost:4321
echo.

:: Pruefe ob WSL verfuegbar ist (bevorzugt, da Node.js dort installiert ist)
where wsl >nul 2>&1
if %errorlevel% == 0 (
    :: WSL gefunden – Windows-Pfad in WSL-Pfad umrechnen und Launcher starten
    for /f "delims=" %%i in ('wsl wslpath -u "%~dp0."') do set WSL_DIR=%%i
    wsl bash --login -c "cd '!WSL_DIR!' && node launcher.mjs"
) else (
    :: Kein WSL – direkte Node.js-Installation nutzen (muss im PATH sein)
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo  FEHLER: Weder WSL noch Node.js gefunden.
        echo  Bitte Node.js installieren: https://nodejs.org
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    node launcher.mjs
)

echo.
echo  Launcher beendet.
pause
