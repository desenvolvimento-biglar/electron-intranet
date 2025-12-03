# Copilot Instructions - Intranet Desktop

Este é um projeto Electron para webview e integração de dispositivos com sistema web.

## Diretrizes do Projeto
- Usar português para documentação e comentários
- Integração com dispositivos do sistema (impressoras, câmeras, USB, etc.)
- Webview seguro para aplicação web
- APIs para comunicação entre web e desktop
- Arquitetura modular e extensível

## Tecnologias
- Electron
- Node.js
- TypeScript
- IPC (Inter-Process Communication)
- APIs de dispositivos do sistema

## Estrutura
- src/main: Processo principal do Electron
- src/renderer: Interface de usuário
- src/services: Serviços de integração de dispositivos
- src/api: APIs de comunicação
- configs: Configurações do projeto