; Script NSIS personalizado para instalação do Intranet Desktop

!macro customInstall
  ; Verifica e instala NAPS2 se necessário
  DetailPrint "Verificando NAPS2..."
  
  IfFileExists "$PROGRAMFILES64\NAPS2\NAPS2.Console.exe" naps2_exists
    DetailPrint "Instalando NAPS2..."
    ; Baixa e instala NAPS2 silenciosamente
    NSISdl::download "https://github.com/cyanfish/naps2/releases/download/v8.2.1/naps2-8.2.1-win-x64.exe" "$TEMP\naps2-setup.exe"
    ExecWait '"$TEMP\naps2-setup.exe" /S'
    Delete "$TEMP\naps2-setup.exe"
  naps2_exists:
  
  ; Copia o perfil do scanner para a pasta do NAPS2
  DetailPrint "Configurando perfil do scanner..."
  SetOutPath "$APPDATA\NAPS2"
  File /r "${BUILD_RESOURCES_DIR}\naps2-profile\*.*"
  
!macroend

!macro customUnInstall
  ; Limpa arquivos de configuração se necessário
!macroend
