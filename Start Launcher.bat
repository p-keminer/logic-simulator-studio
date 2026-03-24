@echo off
title Logic Simulator Studio – Launcher
echo.
echo  Starte Logic Simulator Studio Launcher...
echo  (Browser oeffnet sich automatisch auf http://localhost:4321)
echo.
wsl bash --login -c "cd ~/projects/uni/logic-gate-simulator && node launcher.mjs"
echo.
echo  Launcher wurde beendet.
pause
