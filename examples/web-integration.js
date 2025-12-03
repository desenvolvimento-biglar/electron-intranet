/**
 * Exemplo de integração JavaScript para aplicação web
 * Use este arquivo como base para integrar com o Electron Desktop
 */

class IntranetDesktopClient {
    constructor(apiUrl = 'http://localhost:8080/api/v1') {
        this.apiUrl = apiUrl;
        this.socket = null;
        this.isElectron = window.electronAPI !== undefined;
    }

    /**
     * Inicializa a conexão com o desktop
     */
    async initialize() {
        if (this.isElectron) {
            console.log('Executando dentro do Electron');
            this.setupElectronAPI();
        } else {
            console.log('Executando no navegador, conectando via HTTP');
            await this.testConnection();
            this.setupWebSocket();
        }
    }

    /**
     * Testa conexão com a API
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.apiUrl.replace('/api/v1', '')}/health`);
            const data = await response.json();
            console.log('Conexão com desktop:', data);
            return true;
        } catch (error) {
            console.warn('Desktop não conectado:', error.message);
            return false;
        }
    }

    /**
     * Configura APIs do Electron
     */
    setupElectronAPI() {
        if (!this.isElectron) return;

        // Eventos de dispositivos
        window.electronAPI.onDeviceConnected((device) => {
            console.log('Dispositivo conectado:', device);
            this.onDeviceEvent('connected', device);
        });

        window.electronAPI.onDeviceDisconnected((device) => {
            console.log('Dispositivo desconectado:', device);
            this.onDeviceEvent('disconnected', device);
        });
    }

    /**
     * Configura WebSocket para navegador
     */
    setupWebSocket() {
        if (this.isElectron) return;

        try {
            const socketUrl = this.apiUrl.replace('/api/v1', '').replace('http', 'ws');
            this.socket = new WebSocket(`${socketUrl}`);

            this.socket.onopen = () => {
                console.log('WebSocket conectado');
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.socket.onerror = (error) => {
                console.error('Erro WebSocket:', error);
            };
        } catch (error) {
            console.warn('WebSocket não disponível:', error);
        }
    }

    /**
     * Manipula mensagens WebSocket
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'usb-device-event':
                this.onDeviceEvent(data.event, data.device);
                break;
            case 'serial-data':
                this.onSerialData(data.port, data.data);
                break;
            default:
                console.log('Mensagem WebSocket:', data);
        }
    }

    // === APIs DE IMPRESSÃO ===

    /**
     * Lista impressoras disponíveis
     */
    async getPrinters() {
        if (this.isElectron) {
            return await window.electronAPI.getPrinters();
        } else {
            const response = await fetch(`${this.apiUrl}/printers`);
            const data = await response.json();
            return data.success ? data.data : [];
        }
    }

    /**
     * Imprime documento
     */
    async printDocument(content, type = 'text', options = {}) {
        const printData = { content, type, options };

        if (this.isElectron) {
            return await window.electronAPI.printDocument(printData);
        } else {
            const response = await fetch(`${this.apiUrl}/printers/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(printData)
            });
            const data = await response.json();
            return data.success;
        }
    }

    /**
     * Imprime texto simples
     */
    async printText(text, printerName = null) {
        return await this.printDocument(text, 'text', { printer: printerName });
    }

    /**
     * Imprime HTML
     */
    async printHTML(html, printerName = null) {
        return await this.printDocument(html, 'html', { printer: printerName });
    }

    // === APIs DE CÂMERA ===

    /**
     * Lista câmeras disponíveis
     */
    async getCameras() {
        if (this.isElectron) {
            return await window.electronAPI.getCameras();
        } else {
            const response = await fetch(`${this.apiUrl}/cameras`);
            const data = await response.json();
            return data.success ? data.data : [];
        }
    }

    /**
     * Captura foto
     */
    async capturePhoto(cameraId = '0', options = {}) {
        if (this.isElectron) {
            return await window.electronAPI.capturePhoto();
        } else {
            const response = await fetch(`${this.apiUrl}/cameras/${cameraId}/capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });
            const data = await response.json();
            return data.success ? data.data : null;
        }
    }

    // === APIs USB ===

    /**
     * Lista dispositivos USB
     */
    async getUSBDevices() {
        if (this.isElectron) {
            return await window.electronAPI.getUSBDevices();
        } else {
            const response = await fetch(`${this.apiUrl}/usb/devices`);
            const data = await response.json();
            return data.success ? data.data : [];
        }
    }

    // === APIs SERIAL ===

    /**
     * Lista portas seriais
     */
    async getSerialPorts() {
        if (this.isElectron) {
            return await window.electronAPI.getSerialPorts();
        } else {
            const response = await fetch(`${this.apiUrl}/serial/ports`);
            const data = await response.json();
            return data.success ? data.data : [];
        }
    }

    /**
     * Escreve dados na porta serial
     */
    async serialWrite(port, data) {
        if (this.isElectron) {
            return await window.electronAPI.serialWrite(port, data);
        } else {
            const response = await fetch(`${this.apiUrl}/serial/ports/${port}/write`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            const result = await response.json();
            return result.success;
        }
    }

    // === UTILITÁRIOS ===

    /**
     * Exibe mensagem para o usuário
     */
    async showMessage(message, type = 'info') {
        if (this.isElectron) {
            return await window.electronAPI.showMessageBox({
                type: type,
                message: message,
                buttons: ['OK']
            });
        } else {
            // Fallback para navegador
            alert(message);
        }
    }

    /**
     * Abre diálogo de salvar arquivo
     */
    async showSaveDialog(options = {}) {
        if (this.isElectron) {
            return await window.electronAPI.showSaveDialog(options);
        } else {
            // Fallback para navegador
            const filename = prompt('Nome do arquivo:', 'documento.txt');
            return filename ? { filePath: filename, canceled: false } : { canceled: true };
        }
    }

    // === EVENTOS ===

    /**
     * Callback para eventos de dispositivos
     */
    onDeviceEvent(event, device) {
        console.log(`Dispositivo ${event}:`, device);
        
        // Implementar lógica específica aqui
        if (event === 'connected') {
            this.onDeviceConnected(device);
        } else if (event === 'disconnected') {
            this.onDeviceDisconnected(device);
        }
    }

    /**
     * Callback para dispositivo conectado
     */
    onDeviceConnected(device) {
        // Implementar ação quando dispositivo conectar
    }

    /**
     * Callback para dispositivo desconectado
     */
    onDeviceDisconnected(device) {
        // Implementar ação quando dispositivo desconectar
    }

    /**
     * Callback para dados seriais
     */
    onSerialData(port, data) {
        console.log(`Dados recebidos da porta ${port}:`, data);
        // Implementar processamento dos dados
    }

    /**
     * Limpa recursos
     */
    cleanup() {
        if (this.socket) {
            this.socket.close();
        }

        if (this.isElectron) {
            window.electronAPI.removeAllListeners('device-connected');
            window.electronAPI.removeAllListeners('device-disconnected');
        }
    }
}

// === EXEMPLO DE USO ===

// Instanciar cliente
const desktopClient = new IntranetDesktopClient();

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', async () => {
    await desktopClient.initialize();
    
    // Exemplo de uso das APIs
    setupExamples();
});

function setupExamples() {
    // Exemplo: Botão para listar impressoras
    const btnPrinters = document.getElementById('btn-list-printers');
    if (btnPrinters) {
        btnPrinters.addEventListener('click', async () => {
            try {
                const printers = await desktopClient.getPrinters();
                console.log('Impressoras:', printers);
                
                const list = printers.map(p => p.name).join('\n');
                await desktopClient.showMessage(`Impressoras encontradas:\n${list}`);
            } catch (error) {
                console.error('Erro ao listar impressoras:', error);
            }
        });
    }

    // Exemplo: Botão para capturar foto
    const btnCapture = document.getElementById('btn-capture-photo');
    if (btnCapture) {
        btnCapture.addEventListener('click', async () => {
            try {
                const photo = await desktopClient.capturePhoto();
                console.log('Foto capturada:', photo);
                
                // Se retornou base64, exibir em img
                if (photo && photo.startsWith('data:image')) {
                    const img = document.getElementById('captured-photo');
                    if (img) {
                        img.src = photo;
                    }
                }
            } catch (error) {
                console.error('Erro ao capturar foto:', error);
            }
        });
    }

    // Exemplo: Botão para imprimir
    const btnPrint = document.getElementById('btn-print-test');
    if (btnPrint) {
        btnPrint.addEventListener('click', async () => {
            try {
                const text = 'Teste de impressão do Intranet Desktop\nData: ' + new Date().toLocaleString();
                const success = await desktopClient.printText(text);
                
                if (success) {
                    await desktopClient.showMessage('Documento enviado para impressão!');
                } else {
                    await desktopClient.showMessage('Erro ao imprimir documento', 'error');
                }
            } catch (error) {
                console.error('Erro ao imprimir:', error);
            }
        });
    }
}

// Limpeza quando página descarregar
window.addEventListener('beforeunload', () => {
    desktopClient.cleanup();
});

// Exportar para uso global
window.IntranetDesktopClient = IntranetDesktopClient;
window.desktopClient = desktopClient;