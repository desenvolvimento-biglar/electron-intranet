# Instruções de Instalação - Intranet Desktop

## 🔧 Pré-requisitos Obrigatórios

### 1. Instalação do Node.js

**Node.js 18+ é obrigatório para este projeto**

#### Opção 1: Download Oficial
1. Acesse: https://nodejs.org
2. Baixe a versão **LTS (Recomendada)**
3. Execute o instalador e siga as instruções
4. **IMPORTANTE**: Marque a opção "Add to PATH" durante a instalação

#### Opção 2: Via Chocolatey (Windows)
```powershell
# Instalar Chocolatey primeiro (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Instalar Node.js
choco install nodejs
```

#### Opção 3: Via winget (Windows 10+)
```powershell
winget install OpenJS.NodeJS
```

### 2. Build Tools (Windows)

Para compilar dependências nativas:

#### Opção 1: Visual Studio Build Tools
```powershell
# Via Chocolatey
choco install visualstudio2019buildtools

# Via winget
winget install Microsoft.VisualStudio.2019.BuildTools
```

#### Opção 2: windows-build-tools (Descontinuado, mas ainda funciona)
```bash
npm install -g windows-build-tools
```

### 3. Python (Opcional, para algumas dependências)
```powershell
# Via Chocolatey
choco install python

# Via winget
winget install Python.Python.3
```

## 🚀 Instalação do Projeto

### 1. Verificar Instalações
```bash
# Verificar Node.js
node --version
# Deve retornar algo como: v18.x.x ou superior

# Verificar npm
npm --version
# Deve retornar algo como: 9.x.x ou superior
```

### 2. Instalar Dependências
```bash
# No diretório do projeto
npm install
```

### 3. Compilar TypeScript
```bash
npm run build
```

### 4. Executar em Modo Desenvolvimento
```bash
npm run dev
```

### 5. Executar Versão Compilada
```bash
npm start
```

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure:
```bash
WEB_URL=http://localhost:3000
API_PORT=8080
NODE_ENV=development
```

### 2. Configuração da Aplicação Web
O aplicativo tentará carregar sua aplicação web da URL configurada em `WEB_URL`.

Certifique-se de que sua aplicação web:
- Está executando na URL especificada
- Aceita conexões do Electron
- Implementa as chamadas para as APIs do desktop (opcional)

## 🏗️ Scripts Disponíveis

```json
{
  "scripts": {
    "build": "tsc",                    // Compila TypeScript
    "dev": "tsc && electron .",        // Desenvolvimento
    "start": "electron .",             // Executa compilado
    "build:watch": "tsc --watch",      // Compila e monitora
    "dist": "electron-builder",        // Gera executável
    "postinstall": "electron-builder install-app-deps"
  }
}
```

## 🛠️ Resolução de Problemas

### Erro: 'npm' não é reconhecido
**Problema**: Node.js não está no PATH do sistema

**Soluções**:
1. Reinstale o Node.js marcando "Add to PATH"
2. Reinicie o terminal/VS Code
3. Adicione manualmente ao PATH:
   - Abra Configurações do Sistema > Variáveis de Ambiente
   - Adicione o caminho do Node.js ao PATH
   - Exemplo: `C:\Program Files\nodejs`

### Erro: gyp ERR! (Compilação nativa)
**Problema**: Faltam build tools para compilar dependências nativas

**Soluções**:
1. Instale Visual Studio Build Tools
2. Execute como administrador:
   ```bash
   npm install -g node-gyp
   npm config set msvs_version 2019
   ```

### Erro: EACCES (Permissões)
**Problema**: Permissões de escrita

**Soluções**:
1. Execute o terminal como administrador
2. Configure npm para usar diretório diferente:
   ```bash
   npm config set prefix '~/.npm-global'
   ```

### Erro de Porta em Uso
**Problema**: Porta 8080 já está sendo usada

**Soluções**:
1. Altere a porta no arquivo `.env`
2. Finalize o processo que está usando a porta:
   ```bash
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   ```

## 📱 Testando a Instalação

### 1. Teste Básico
```bash
# Compile e execute
npm run build
npm start
```

### 2. Teste de APIs
```bash
# Em outro terminal, teste a API
curl http://localhost:8080/health
```

### 3. Teste de Dispositivos
- Abra o menu "Dispositivos" no aplicativo
- Teste cada funcionalidade:
  - Listar Impressoras
  - Testar Câmera
  - Verificar USB

## 🔄 Próximos Passos

1. **Configure sua aplicação web** para usar as APIs do desktop
2. **Personalize as configurações** no menu do aplicativo
3. **Implemente handlers específicos** para seus dispositivos
4. **Configure auto-inicialização** se necessário

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs em `%APPDATA%/intranet-desktop/logs/`
2. Consulte a documentação no README.md
3. Abra uma issue no repositório