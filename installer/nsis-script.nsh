; Script NSIS personalizado para instalação do Intranet Desktop

!macro customInstall
  ; Verifica e instala NAPS2 se necessário
  DetailPrint "Verificando NAPS2..."
  
  IfFileExists "$PROGRAMFILES64\NAPS2\NAPS2.Console.exe" naps2_exists
    DetailPrint "NAPS2 nao encontrado. Instale manualmente de https://www.naps2.com/"
  naps2_exists:
  
  ; Copia o perfil do scanner para a pasta do NAPS2
  DetailPrint "Configurando perfil do scanner..."
  CreateDirectory "$APPDATA\NAPS2"
  SetOutPath "$APPDATA\NAPS2"
  
  ; Usa /nonfatal para não falhar se o arquivo não existir
  File /nonfatal "${PROJECT_DIR}\naps2-profile\profiles.xml"
  
!macroend

!macro customUnInstall
  ; Limpa arquivos de configuração se necessário
!macroend
