@echo off
title Freight Billing Tracker Server
echo ===================================================
echo Starting Freight Billing Tracker Web Server...
echo ===================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
