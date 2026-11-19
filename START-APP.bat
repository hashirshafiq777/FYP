@echo off
rem Double-click to set up (first time) and start LegalDocReader.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"
