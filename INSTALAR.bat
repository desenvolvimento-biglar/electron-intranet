@echo off
echo Iniciando instalacao do Intranet Desktop...
echo.
echo ATENCAO: Este instalador precisa de permissao de administrador.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
