# Guia de Instalação - Intranet Desktop

## Requisitos
- Windows 10 ou superior (64 bits)
- Scanner Brother ADS-4700W (ou compatível)

## Instalação Rápida

### 1. Instalar o Intranet Desktop
Execute o arquivo `Intranet Desktop Setup 1.0.0.exe` e siga as instruções.

### 2. Instalar o NAPS2 (Scanner)
O NAPS2 é necessário para a funcionalidade de scanner.

**Opção A - Automática (recomendada):**
```powershell
winget install --id Cyanfish.NAPS2 -e --accept-package-agreements
```

**Opção B - Manual:**
Baixe e instale de: https://www.naps2.com/download

### 3. Configurar o Perfil do Scanner

1. Abra o NAPS2 (Menu Iniciar → NAPS2)
2. Clique em **"Novo perfil"**
3. Configure:
   - **Nome**: `BrotherADF`
   - **Driver**: WIA
   - **Dispositivo**: Seu scanner (ex: Brother ADS-4700W)
   - **Origem do papel**: Alimentador
   - **Tamanho da folha**: A4 (210x297 mm)
   - **Resolução**: 200 dpi
   - **Qualidade**: Colorido 24 bits
4. Clique em **OK**

### 4. Testar
- Coloque um documento no alimentador do scanner
- Abra o Intranet Desktop
- Teste a digitalização pelo sistema

## Instalação Automática do Perfil (Opcional)

Se você recebeu o arquivo `profiles.xml`, copie para:
```
%APPDATA%\NAPS2\profiles.xml
```

Ou execute este comando no PowerShell:
```powershell
Copy-Item "profiles.xml" "$env:APPDATA\NAPS2\profiles.xml" -Force
```

## Solução de Problemas

### Scanner não detectado
1. Verifique se o scanner está ligado e conectado
2. Instale os drivers do fabricante
3. Teste no NAPS2 antes de usar no sistema

### Erro "NAPS2 não encontrado"
Instale o NAPS2 seguindo o passo 2 acima.

### Perfil não encontrado
Crie o perfil chamado **BrotherADF** seguindo o passo 3.

## Estrutura dos Arquivos

```
📁 Pasta de Instalação
├── Intranet Desktop.exe    (Aplicativo principal)
├── resources/              (Recursos do app)
└── ...

📁 %APPDATA%\NAPS2
└── profiles.xml            (Perfis de scanner)
```

## Suporte
Em caso de problemas, entre em contato com o suporte técnico.
