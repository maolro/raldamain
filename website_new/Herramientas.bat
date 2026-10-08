@echo off
rem Abre el Editor de Rangos, Criaturas, Equipo y el Taller (fichas + simulador).
rem Doble clic, o desde una terminal: Herramientas.bat [--no-browser] [rangos criaturas equipo taller]
title Herramientas de Raldamain
cd /d "%~dp0"
python tools\launch_all.py %*
if errorlevel 1 pause
