# Intranet Desktop

Aplicativo Electron para integração com dispositivos do sistema e webview seguro para aplicações web.

## 📋 Características

- **Webview Seguro**: Interface webview isolada para aplicação web
- **Integração de Dispositivos**: Acesso a impressoras, câmeras, USB e portas seriais
- **API REST**: Endpoints para comunicação entre web e desktop
- **WebSocket**: Comunicação em tempo real
- **Multiplataforma**: Suporte para Windows, macOS e Linux
- **Segurança**: Contexto isolado e preload scripts seguros

## 🚀 Instalação

### Pré-requisitos

- Node.js 16+ 
- npm ou yarn
- Windows: Build Tools do Visual Studio ou Build Tools for Visual Studio 2019

### Configuração

1. Clone o repositório:
```bash
git clone https://github.com/biglar-dev/intranet-desktop.git
cd intranet-desktop
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
# Crie um arquivo .env na raiz do projeto
WEB_URL=http://localhost:3000
API_PORT=8080
NODE_ENV=development
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
# Compilar TypeScript
npm run build

# Modo desenvolvimento (compila e executa)
npm run dev

# Executar aplicativo compilado
npm start

# Compilar e observar mudanças
npm run build:watch

# Gerar distribuível
npm run dist
```

### Estrutura do Projeto

```
src/
├── main/           # Processo principal do Electron
│   └── main.ts     # Arquivo principal
├── renderer/       # Interface do usuário
│   ├── preload.ts  # Script de preload
│   └── config.html # Janela de configurações
├── services/       # Serviços de integração
│   ├── DeviceService.ts    # Classe base
│   ├── PrinterService.ts   # Serviço de impressoras
│   ├── CameraService.ts    # Serviço de câmeras
│   ├── USBService.ts       # Serviço USB
│   └── SerialService.ts    # Serviço de comunicação serial
└── api/            # API REST e WebSocket
    └── ApiServer.ts # Servidor de API
```

## 🔌 APIs Disponíveis

### Impressoras

```typescript
// Listar impressoras
const printers = await window.electronAPI.getPrinters();

// Imprimir documento
await window.electronAPI.printDocument({
  content: 'Texto a imprimir',
  type: 'text', // 'text' | 'html' | 'pdf'
  options: {
    printer: 'Nome da Impressora',
    copies: 1
  }
});
```

### Câmeras

```typescript
// Listar câmeras
const cameras = await window.electronAPI.getCameras();

// Capturar foto
const photo = await window.electronAPI.capturePhoto();
```

### Dispositivos USB

```typescript
// Listar dispositivos USB
const devices = await window.electronAPI.getUSBDevices();
```

### Comunicação Serial

```typescript
// Listar portas seriais
const ports = await window.electronAPI.getSerialPorts();

// Escrever dados
await window.electronAPI.serialWrite('COM1', 'dados');
```

## 🌐 API REST

O aplicativo expõe uma API REST em `http://localhost:8080/api/v1` com os seguintes endpoints:

### Impressoras
- `GET /printers` - Lista impressoras
- `POST /printers/print` - Imprime documento
- `GET /printers/:name/test` - Testa impressora

### Câmeras
- `GET /cameras` - Lista câmeras
- `POST /cameras/:id/capture` - Captura foto
- `POST /cameras/:id/stream/start` - Inicia stream
- `POST /cameras/:id/stream/stop` - Para stream

### USB
- `GET /usb/devices` - Lista dispositivos USB
- `GET /usb/devices/:id` - Informações de dispositivo
- `GET /usb/devices/class/:class` - Filtra por classe

### Comunicação Serial
- `GET /serial/ports` - Lista portas seriais
- `POST /serial/ports/:port/open` - Abre porta
- `POST /serial/ports/:port/close` - Fecha porta
- `POST /serial/ports/:port/write` - Escreve dados
- `GET /serial/ports/:port/read` - Lê dados

## 🔒 Segurança

- **Context Isolation**: Habilitado para isolamento de contexto
- **Node Integration**: Desabilitado no renderer
- **Preload Scripts**: APIs expostas de forma segura
- **CORS**: Configurado para origens permitidas
- **CSP**: Content Security Policy configurado

## ⚙️ Configuração

### Arquivo de Configuração

Crie um arquivo `config.json` na pasta do usuário:

```json
{
  "webUrl": "http://localhost:3000",
  "apiPort": 8080,
  "allowedOrigins": [
    "http://localhost:3000",
    "http://localhost:8000"
  ],
  "autoStart": true,
  "logLevel": "info"
}
```

### Variáveis de Ambiente

- `WEB_URL`: URL da aplicação web (padrão: http://localhost:3000)
- `API_PORT`: Porta da API REST (padrão: 8080)
- `NODE_ENV`: Ambiente de execução (development/production)

## 🐛 Debug

### Logs

Os logs são salvos em:
- Windows: `%APPDATA%/intranet-desktop/logs/`
- macOS: `~/Library/Application Support/intranet-desktop/logs/`
- Linux: `~/.config/intranet-desktop/logs/`

### Developer Tools

No modo desenvolvimento, as ferramentas de desenvolvedor são abertas automaticamente.

## 📦 Distribuição

### Gerar Executável

```bash
# Gerar para plataforma atual
npm run dist

# Especificar plataforma
npm run dist -- --win
npm run dist -- --mac
npm run dist -- --linux
```

### Configuração de Build

Veja `package.json` seção `build` para configurações do Electron Builder.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Abra uma [issue](https://github.com/biglar-dev/intranet-desktop/issues)
- Entre em contato: suporte@bstech.com.br

## 🔄 Versionamento

Usamos [SemVer](http://semver.org/) para versionamento. Para versões disponíveis, veja as [tags neste repositório](https://github.com/biglar-dev/intranet-desktop/tags).

## 👥 Autores

- **Biglar Dev** - *Trabalho inicial* - [Biglar Dev](https://github.com/biglar-dev)