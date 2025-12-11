# 📖 Manual do Usuário - Intranet Desktop

## Guia Completo de Instalação

---

## 📋 Índice

1. [Sobre o Aplicativo](#-sobre-o-aplicativo)
2. [Requisitos do Sistema](#-requisitos-do-sistema)
3. [Download do Instalador](#-download-do-instalador)
4. [Instalação Passo a Passo](#-instalação-passo-a-passo)
5. [Configuração do Scanner](#-configuração-do-scanner)
6. [Primeiro Uso](#-primeiro-uso)
7. [Solução de Problemas](#-solução-de-problemas)
8. [Perguntas Frequentes](#-perguntas-frequentes)
9. [Suporte](#-suporte)

---

## 📱 Sobre o Aplicativo

O **Intranet Desktop** é um aplicativo que permite a integração entre o sistema web da intranet e os dispositivos do seu computador, como:

- 🖨️ **Impressoras** - Impressão direta de documentos
- 📷 **Câmeras** - Captura de fotos e documentos
- 📄 **Scanners** - Digitalização de documentos
- 🔌 **Dispositivos USB** - Integração com leitores e outros periféricos

---

## 💻 Requisitos do Sistema

Antes de instalar, verifique se seu computador atende aos requisitos mínimos:

| Requisito               | Especificação                      |
| ----------------------- | ---------------------------------- |
| **Sistema Operacional** | Windows 10 ou Windows 11 (64 bits) |
| **Memória RAM**         | Mínimo 4 GB                        |
| **Espaço em Disco**     | Mínimo 500 MB disponíveis          |
| **Conexão**             | Internet ou rede local             |
| **Scanner (opcional)**  | Brother ADS-4700W ou compatível    |

---

## 📥 Download do Instalador

### Obtendo o Arquivo de Instalação

1. Acesse o local indicado pelo administrador do sistema
2. Baixe o arquivo: **`Intranet Desktop Setup 1.0.0.exe`**
3. Salve o arquivo em uma pasta de fácil acesso (ex: Área de Trabalho)

> ⚠️ **Atenção**: Baixe o instalador apenas de fontes oficiais fornecidas pela sua empresa.

---

## 🔧 Instalação Passo a Passo

### Método 1: Instalação Automática (Recomendado)

#### Passo 1 - Executar o Instalador Automático

1. Localize a pasta com os arquivos de instalação
2. Clique com o **botão direito** no arquivo `INSTALAR.bat`
3. Selecione **"Executar como administrador"**

![Executar como Administrador](https://via.placeholder.com/500x200/0078D4/FFFFFF?text=Clique+Direito+→+Executar+como+administrador)

4. Clique em **"Sim"** na janela de confirmação do Windows

#### Passo 2 - Aguardar a Instalação

O instalador irá automaticamente:

- ✅ Verificar e instalar o NAPS2 (software de scanner)
- ✅ Configurar o perfil do scanner
- ✅ Criar atalho na Área de Trabalho

Aguarde até ver a mensagem: **"Instalação Concluída!"**

#### Passo 3 - Pressionar Qualquer Tecla

Quando a instalação terminar, pressione qualquer tecla para fechar a janela.

---

### Método 2: Instalação Manual

Se preferir instalar manualmente, siga estes passos:

#### Passo 1 - Executar o Instalador Principal

1. Localize o arquivo **`Intranet Desktop Setup 1.0.0.exe`**
2. Dê um **duplo clique** para executar
3. Se aparecer uma mensagem de segurança do Windows, clique em **"Mais informações"** e depois em **"Executar assim mesmo"**

#### Passo 2 - Seguir o Assistente de Instalação

```
┌─────────────────────────────────────────────┐
│     Bem-vindo ao Instalador                 │
│     Intranet Desktop                        │
│                                             │
│  Este assistente irá guiar você na         │
│  instalação do aplicativo.                  │
│                                             │
│  Clique em [Próximo] para continuar.        │
│                                             │
│     [Próximo]  [Cancelar]                   │
└─────────────────────────────────────────────┘
```

1. Clique em **Próximo** na tela de boas-vindas
2. Leia e aceite os termos de uso
3. Escolha a pasta de instalação (ou mantenha o padrão)
4. Clique em **Instalar**
5. Aguarde a conclusão
6. Clique em **Concluir**

#### Passo 3 - Instalar o NAPS2 (Para Scanner)

Se você utiliza scanner, precisa instalar o NAPS2:

1. Acesse: **https://www.naps2.com/download**
2. Clique no botão **Download** para Windows
3. Execute o arquivo baixado
4. Siga as instruções do instalador

---

## 📄 Configuração do Scanner

Se você possui um scanner e deseja utilizá-lo com o sistema, siga estas instruções:

### Passo 1 - Abrir o NAPS2

1. Clique no **Menu Iniciar** do Windows
2. Digite **"NAPS2"**
3. Clique no ícone do **NAPS2** para abrir

### Passo 2 - Criar Perfil do Scanner

1. Na janela do NAPS2, clique em **"Perfis"** (ou "Profiles")
2. Clique em **"Novo"** para criar um novo perfil

### Passo 3 - Configurar o Perfil

Preencha as configurações conforme a tabela abaixo:

| Campo                | Valor                            |
| -------------------- | -------------------------------- |
| **Nome do perfil**   | `BrotherADF`                     |
| **Driver**           | WIA                              |
| **Dispositivo**      | _Selecione seu scanner na lista_ |
| **Origem do papel**  | Alimentador (ADF)                |
| **Tamanho da folha** | A4 (210 x 297 mm)                |
| **Resolução**        | 200 dpi                          |
| **Qualidade**        | Colorido 24 bits                 |

> 📌 **Importante**: O nome do perfil deve ser **exatamente** `BrotherADF` para funcionar corretamente.

### Passo 4 - Salvar e Testar

1. Clique em **OK** para salvar o perfil
2. Coloque um documento no alimentador do scanner
3. Selecione o perfil **BrotherADF**
4. Clique em **Digitalizar** para testar

---

## 🚀 Primeiro Uso

### Iniciando o Aplicativo

1. Localize o ícone **"Intranet Desktop"** na Área de Trabalho
2. Dê um **duplo clique** para abrir

```
    ┌──────────────┐
    │  📁         │
    │  Intranet   │
    │  Desktop    │
    └──────────────┘
```

### Tela Principal

Ao abrir o aplicativo, você verá a interface do sistema web carregada automaticamente.

### Funcionalidades Disponíveis

| Funcionalidade   | Descrição                         |
| ---------------- | --------------------------------- |
| 🖨️ Imprimir      | Imprime documentos diretamente    |
| 📷 Câmera        | Captura fotos usando a webcam     |
| 📄 Scanner       | Digitaliza documentos             |
| ⚙️ Configurações | Ajusta preferências do aplicativo |

---

## 🔧 Solução de Problemas

### Problema: "Aplicativo não abre"

**Soluções:**

1. Reinicie o computador
2. Execute o aplicativo como administrador (clique direito → Executar como administrador)
3. Verifique se o antivírus não está bloqueando

### Problema: "Scanner não detectado"

**Soluções:**

1. Verifique se o scanner está **ligado**
2. Verifique se o cabo USB ou rede está **conectado**
3. Instale os drivers do fabricante do scanner
4. Teste o scanner diretamente no NAPS2

### Problema: "Erro: NAPS2 não encontrado"

**Solução:**
Instale o NAPS2 seguindo as instruções da seção [Instalação Manual - Passo 3](#passo-3---instalar-o-naps2-para-scanner)

### Problema: "Perfil BrotherADF não encontrado"

**Solução:**
Crie o perfil seguindo as instruções da seção [Configuração do Scanner](#-configuração-do-scanner)

### Problema: "Impressora não funciona"

**Soluções:**

1. Verifique se a impressora está **ligada** e **online**
2. Imprima uma página de teste pelo Windows
3. Reinicie o serviço de impressão:
   - Pressione `Windows + R`
   - Digite `services.msc` e pressione Enter
   - Encontre **"Spooler de Impressão"**
   - Clique direito → **Reiniciar**

### Problema: "Tela branca ou não carrega"

**Soluções:**

1. Verifique sua conexão com a internet/rede
2. Pressione `Ctrl + R` para recarregar
3. Feche e abra o aplicativo novamente

---

## ❓ Perguntas Frequentes

### O aplicativo é gratuito?

Sim, para uso interno da empresa.

### Preciso de internet para usar?

Você precisa estar conectado à rede da empresa (internet ou rede local).

### Posso usar qualquer scanner?

O sistema foi otimizado para o **Brother ADS-4700W**, mas funciona com outros scanners compatíveis com NAPS2.

### Como atualizo o aplicativo?

Quando houver atualizações, você será notificado. Basta baixar a nova versão e instalar sobre a atual.

### O aplicativo inicia automaticamente com o Windows?

Não por padrão. Se desejar, adicione o atalho à pasta de Inicialização do Windows.

### Onde ficam os arquivos digitalizados?

Os arquivos são enviados diretamente para o sistema web. Não ficam salvos localmente por padrão.

---

## 📞 Suporte

### Contato

Se você encontrar algum problema que não consegue resolver, entre em contato com o suporte técnico:

- 📧 **E-mail**: suporte@empresa.com.br
- 📱 **Telefone**: (XX) XXXX-XXXX
- 💬 **Chat interno**: Abra um chamado pelo sistema

### Informações Úteis para o Suporte

Ao entrar em contato, tenha em mãos:

1. **Versão do aplicativo**: Intranet Desktop 1.0.0
2. **Sistema operacional**: Windows 10 ou 11
3. **Descrição do problema**: O que aconteceu?
4. **Mensagem de erro**: Se houver, anote o texto exato
5. **Passos para reproduzir**: O que você fez antes do erro?

---

## 📝 Versões do Documento

| Versão | Data       | Descrição                |
| ------ | ---------- | ------------------------ |
| 1.0    | 11/12/2024 | Versão inicial do manual |

---

<div align="center">

**Intranet Desktop v1.0.0**

Desenvolvido com ❤️ pela equipe de TI

</div>
