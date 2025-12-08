# Script de Instalação - Intranet Desktop
# Execute este script como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalador Intranet Desktop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se está rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Execute este script como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito e selecione 'Executar como administrador'" -ForegroundColor Yellow
    pause
    exit 1
}

# 1. Instalar NAPS2
Write-Host "[1/3] Verificando NAPS2..." -ForegroundColor Yellow
if (Test-Path "C:\Program Files\NAPS2\NAPS2.Console.exe") {
    Write-Host "      NAPS2 já está instalado!" -ForegroundColor Green
} else {
    Write-Host "      Instalando NAPS2..." -ForegroundColor Yellow
    try {
        winget install --id Cyanfish.NAPS2 -e --accept-package-agreements --accept-source-agreements --silent
        Write-Host "      NAPS2 instalado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "      Erro ao instalar NAPS2. Instale manualmente: https://www.naps2.com/" -ForegroundColor Red
    }
}

# 2. Configurar perfil do scanner
Write-Host "[2/3] Configurando perfil do scanner..." -ForegroundColor Yellow
$naps2ProfileDir = "$env:APPDATA\NAPS2"
if (-not (Test-Path $naps2ProfileDir)) {
    New-Item -ItemType Directory -Path $naps2ProfileDir -Force | Out-Null
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileSource = Join-Path $scriptDir "naps2-profile\profiles.xml"

if (Test-Path $profileSource) {
    Copy-Item $profileSource "$naps2ProfileDir\profiles.xml" -Force
    Write-Host "      Perfil do scanner configurado!" -ForegroundColor Green
} else {
    Write-Host "      Arquivo de perfil não encontrado. Configure manualmente no NAPS2." -ForegroundColor Yellow
}

# 3. Criar atalho na área de trabalho
Write-Host "[3/3] Criando atalho..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Intranet Desktop.lnk"
$targetPath = Join-Path $scriptDir "Intranet Desktop.exe"

if (Test-Path $targetPath) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.Description = "Intranet Desktop - Sistema de Integração"
    $shortcut.Save()
    Write-Host "      Atalho criado na área de trabalho!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalação Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Se o scanner for diferente de 'Brother ADS-4700W'," -ForegroundColor White
Write-Host "  abra o NAPS2 e configure um novo perfil." -ForegroundColor White
Write-Host ""
pause
