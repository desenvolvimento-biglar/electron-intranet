# Script de Instalação - Intranet Desktop
# Configura NAPS2 e cria atalho para o app

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurador Intranet Desktop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseDir = Join-Path $scriptDir "release\win-unpacked"
$targetPath = Join-Path $releaseDir "Intranet Desktop.exe"

# Verifica se o executável existe
if (-not (Test-Path $targetPath)) {
    Write-Host "ERRO: Executavel nao encontrado em:" -ForegroundColor Red
    Write-Host "      $targetPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute primeiro: npm run dist" -ForegroundColor Yellow
    pause
    exit 1
}

# 1. Instalar NAPS2
Write-Host "[1/3] Verificando NAPS2..." -ForegroundColor Yellow
if (Test-Path "C:\Program Files\NAPS2\NAPS2.Console.exe") {
    Write-Host "      NAPS2 ja esta instalado!" -ForegroundColor Green
} else {
    Write-Host "      NAPS2 nao encontrado." -ForegroundColor Yellow
    $resposta = Read-Host "      Deseja instalar o NAPS2 automaticamente? (S/N)"
    if ($resposta -eq "S" -or $resposta -eq "s") {
        try {
            Write-Host "      Instalando NAPS2..." -ForegroundColor Yellow
            winget install --id Cyanfish.NAPS2 -e --accept-package-agreements --accept-source-agreements --silent
            Write-Host "      NAPS2 instalado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "      Erro ao instalar NAPS2. Instale manualmente: https://www.naps2.com/" -ForegroundColor Red
        }
    } else {
        Write-Host "      Pulando instalacao do NAPS2." -ForegroundColor Gray
        Write-Host "      Baixe em: https://www.naps2.com/" -ForegroundColor Gray
    }
}

# 2. Configurar perfil do scanner
Write-Host "[2/3] Configurando perfil do scanner..." -ForegroundColor Yellow
$naps2ProfileDir = "$env:APPDATA\NAPS2"
if (-not (Test-Path $naps2ProfileDir)) {
    New-Item -ItemType Directory -Path $naps2ProfileDir -Force | Out-Null
}

$profileSource = Join-Path $scriptDir "naps2-profile\profiles.xml"

if (Test-Path $profileSource) {
    Copy-Item $profileSource "$naps2ProfileDir\profiles.xml" -Force
    Write-Host "      Perfil do scanner configurado!" -ForegroundColor Green
} else {
    Write-Host "      Arquivo de perfil nao encontrado. Configure manualmente no NAPS2." -ForegroundColor Yellow
}

# 3. Criar atalho na área de trabalho
Write-Host "[3/3] Criando atalho na area de trabalho..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Intranet Desktop.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $releaseDir
$shortcut.Description = "Intranet Desktop - Sistema de Integracao"
$shortcut.Save()
Write-Host "      Atalho criado na area de trabalho!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracao Concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "- Se o scanner for diferente de 'Brother ADS-4700W'," -ForegroundColor White
Write-Host "  abra o NAPS2 e configure um novo perfil." -ForegroundColor White
Write-Host ""
Write-Host "Voce pode executar o app pelo atalho na area de trabalho" -ForegroundColor Green
Write-Host "ou diretamente de: $targetPath" -ForegroundColor Gray
Write-Host ""
pause
