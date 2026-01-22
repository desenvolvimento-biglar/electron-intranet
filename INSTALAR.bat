@echo off
chcp 65001 >nul
title Instalador Intranet Desktop

echo ========================================
echo    INSTALADOR INTRANET DESKTOP
echo ========================================
echo.

cd /d "%~dp0"

:: Verifica se Node.js está instalado
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js de: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/5] Node.js encontrado
for /f "tokens=*" %%i in ('node -v') do echo       Versao: %%i
echo.

:: Instala dependências
echo [2/5] Instalando dependencias...
echo       Isso pode demorar alguns minutos...
call npm install
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo       OK - Dependencias instaladas
echo.

:: Compila TypeScript
echo [3/5] Compilando TypeScript...
call npm run build
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao compilar TypeScript!
    pause
    exit /b 1
)
echo       OK - Compilacao concluida
echo.

:: Cria o executável
echo [4/5] Criando executavel...
echo       Isso pode demorar alguns minutos...
call npm run dist
if %errorLevel% neq 0 (
    echo [ERRO] Falha ao criar executavel!
    pause
    exit /b 1
)
echo       OK - Executavel criado em release\
echo.

:: Executar instalação do NAPS2 e configurações
echo [5/5] Finalizando instalacao...
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo ========================================
echo    BUILD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo O executavel esta em: %~dp0release\win-unpacked\
echo O instalador esta em: %~dp0release\
echo.
pause
