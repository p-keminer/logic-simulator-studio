@echo off
setlocal enabledelayedexpansion
title Logic Simulator Studio – Launcher
echo.
echo   Logic Simulator Studio – Launcher
echo   Browser oeffnet sich automatisch auf http://localhost:4321
echo.

:: ── Arbeitsverzeichnis auf Skript-Ordner setzen ──────────────────────────
cd /d "%~dp0"

:: ── Node.js pruefen ──────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   FEHLER: Node.js nicht gefunden.
    echo   Bitte installieren: https://nodejs.org
    echo.
    pause
    exit /b 1
)

node launcher.mjs --check-runtime
if %errorlevel% neq 0 (
    echo.
    echo   Bitte installiere Node.js 22.13 oder mindestens Version 24.
    echo.
    pause
    exit /b 1
)

:: ── Abhaengigkeiten pruefen und ggf. installieren ───────────────────────
if not exist "node_modules" (
    echo   node_modules nicht gefunden – installiere Abhaengigkeiten...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        echo.
        echo   FEHLER: npm install fehlgeschlagen.
        pause
        exit /b 1
    )
    echo.
)

:: ── Broker-Abhaengigkeiten pruefen ──────────────────────────────────────
set BROKER_DIR=broker
if exist "%BROKER_DIR%\package.json" (
    if not exist "%BROKER_DIR%\node_modules" (
        echo   Broker node_modules nicht gefunden – installiere...
        echo.
        pushd "%BROKER_DIR%"
        call npm install
        if !errorlevel! neq 0 (
            popd
            echo.
            echo   FEHLER: Broker npm install fehlgeschlagen.
            pause
            exit /b 1
        )
        popd
        echo.
    )
)

:: ── Broker .env pruefen (aus .env.example erstellen falls fehlend) ──────
if exist "%BROKER_DIR%\package.json" (
    if not exist "%BROKER_DIR%\.env" (
        if exist "%BROKER_DIR%\.env.example" (
            echo   Broker .env nicht gefunden – erstelle aus .env.example...
            copy "%BROKER_DIR%\.env.example" "%BROKER_DIR%\.env" >nul
            echo   HINWEIS: Provider und Modell kannst du optional
            echo            in broker\.env konfigurieren.
            echo.
        )
    )
)

:: ── Launcher starten ────────────────────────────────────────────────────
node launcher.mjs

echo.
echo   Launcher beendet.
pause
