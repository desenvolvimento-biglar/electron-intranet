import { DeviceService } from './DeviceService';

interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  friendlyName?: string;
  status: 'available' | 'busy' | 'error';
}

interface SerialPortOptions {
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 1.5 | 2;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
  rtscts?: boolean;
  xon?: boolean;
  xoff?: boolean;
  xany?: boolean;
  autoOpen?: boolean;
}

/**
 * Serviço para comunicação serial (COM ports)
 */
export class SerialService extends DeviceService {
  private ports: Map<string, SerialPortInfo> = new Map();
  private openConnections: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.scanSerialPorts();
      this.isInitialized = true;
      console.log('SerialService inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar SerialService:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Fechar todas as conexões abertas
    for (const [portPath, connection] of this.openConnections) {
      try {
        if (connection && typeof connection.close === 'function') {
          connection.close();
        }
      } catch (error) {
        console.error(`Erro ao fechar porta ${portPath}:`, error);
      }
    }

    this.openConnections.clear();
    this.ports.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log('SerialService finalizado');
  }

  async isDeviceAvailable(portPath: string): Promise<boolean> {
    const port = this.ports.get(portPath);
    return port ? port.status === 'available' : false;
  }

  async getAvailableDevices(): Promise<SerialPortInfo[]> {
    await this.scanSerialPorts();
    return Array.from(this.ports.values());
  }

  async getDeviceInfo(portPath: string): Promise<SerialPortInfo | null> {
    return this.ports.get(portPath) || null;
  }

  async testDevice(portPath: string): Promise<boolean> {
    try {
      // Testar abertura rápida da porta
      return await this.testPortConnection(portPath);
    } catch (error) {
      console.error(`Erro ao testar porta serial ${portPath}:`, error);
      return false;
    }
  }

  /**
   * Obtém lista de portas seriais disponíveis
   */
  async getPorts(): Promise<SerialPortInfo[]> {
    return await this.getAvailableDevices();
  }

  /**
   * Abre conexão com porta serial
   */
  async openPort(portPath: string, options: SerialPortOptions = {}): Promise<boolean> {
    try {
      if (this.openConnections.has(portPath)) {
        throw new Error(`Porta ${portPath} já está aberta`);
      }

      const port = await this.getDeviceInfo(portPath);
      if (!port) {
        throw new Error(`Porta ${portPath} não encontrada`);
      }

      if (port.status !== 'available') {
        throw new Error(`Porta ${portPath} não está disponível`);
      }

      // Configurações padrão
      const serialOptions = {
        path: portPath,
        baudRate: options.baudRate || 9600,
        dataBits: options.dataBits || 8,
        stopBits: options.stopBits || 1,
        parity: options.parity || 'none',
        rtscts: options.rtscts || false,
        xon: options.xon || false,
        xoff: options.xoff || false,
        xany: options.xany || false,
        autoOpen: options.autoOpen !== false
      };

      const connection = await this.createSerialConnection(portPath, serialOptions);
      this.openConnections.set(portPath, connection);

      // Atualizar status da porta
      port.status = 'busy';
      
      this.emit('port-opened', { portPath, options: serialOptions });
      return true;
    } catch (error) {
      console.error(`Erro ao abrir porta ${portPath}:`, error);
      this.emit('port-error', { portPath, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Fecha conexão com porta serial
   */
  async closePort(portPath: string): Promise<boolean> {
    try {
      const connection = this.openConnections.get(portPath);
      if (!connection) {
        return true; // Já está fechada
      }

      await this.closeSerialConnection(connection);
      this.openConnections.delete(portPath);

      // Atualizar status da porta
      const port = this.ports.get(portPath);
      if (port) {
        port.status = 'available';
      }

      this.emit('port-closed', { portPath });
      return true;
    } catch (error) {
      console.error(`Erro ao fechar porta ${portPath}:`, error);
      return false;
    }
  }

  /**
   * Escreve dados na porta serial
   */
  async write(portPath: string, data: string | Buffer): Promise<boolean> {
    try {
      const connection = this.openConnections.get(portPath);
      if (!connection) {
        throw new Error(`Porta ${portPath} não está aberta`);
      }

      await this.writeToConnection(connection, data);
      this.emit('data-sent', { portPath, data });
      return true;
    } catch (error) {
      console.error(`Erro ao escrever na porta ${portPath}:`, error);
      this.emit('write-error', { portPath, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Lê dados da porta serial
   */
  async read(portPath: string, timeout: number = 5000): Promise<string> {
    try {
      const connection = this.openConnections.get(portPath);
      if (!connection) {
        throw new Error(`Porta ${portPath} não está aberta`);
      }

      const data = await this.readFromConnection(connection, timeout);
      this.emit('data-received', { portPath, data });
      return data;
    } catch (error) {
      console.error(`Erro ao ler da porta ${portPath}:`, error);
      this.emit('read-error', { portPath, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Configura listener para dados recebidos
   */
  async onData(portPath: string, callback: (data: string) => void): Promise<void> {
    const connection = this.openConnections.get(portPath);
    if (!connection) {
      throw new Error(`Porta ${portPath} não está aberta`);
    }

    // Configurar listener na conexão
    this.setupDataListener(connection, callback);
  }

  /**
   * Remove listener de dados
   */
  async removeDataListener(portPath: string): Promise<void> {
    const connection = this.openConnections.get(portPath);
    if (connection) {
      this.removeDataListenerFromConnection(connection);
    }
  }

  /**
   * Escaneia portas seriais disponíveis
   */
  private async scanSerialPorts(): Promise<void> {
    try {
      this.ports.clear();

      // Método 1: Usar PowerShell para listar portas COM
      await this.scanWithPowerShell();

      // Método 2: Tentar usar biblioteca serialport
      await this.scanWithSerialPortLibrary();

      this.emit('ports-updated', Array.from(this.ports.values()));
    } catch (error) {
      console.error('Erro ao escanear portas seriais:', error);
    }
  }

  /**
   * Escaneia usando PowerShell
   */
  private async scanWithPowerShell(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Listar portas COM usando PowerShell
      const command = `powershell.exe -Command "Get-CimInstance -ClassName Win32_SerialPort | Select-Object DeviceID, Name, Description, Manufacturer, PNPDeviceID | ConvertTo-Json"`;

      const output = execSync(command, { encoding: 'utf8' });
      
      if (output.trim()) {
        const portsData = JSON.parse(output);
        const portsList = Array.isArray(portsData) ? portsData : [portsData];

        portsList.forEach((portData: any) => {
          if (portData && portData.DeviceID) {
            const portInfo = this.parsePortData(portData);
            if (portInfo) {
              this.ports.set(portInfo.path, portInfo);
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro no escaneamento PowerShell:', error);
    }
  }

  /**
   * Tenta usar biblioteca serialport
   */
  private async scanWithSerialPortLibrary(): Promise<void> {
    try {
      const { SerialPort } = require('serialport');
      
      const ports = await SerialPort.list();
      
      ports.forEach((port: any) => {
        if (!this.ports.has(port.path)) {
          const portInfo: SerialPortInfo = {
            path: port.path,
            manufacturer: port.manufacturer,
            serialNumber: port.serialNumber,
            pnpId: port.pnpId,
            vendorId: port.vendorId,
            productId: port.productId,
            locationId: port.locationId,
            friendlyName: port.friendlyName,
            status: 'available'
          };
          
          this.ports.set(port.path, portInfo);
        }
      });
    } catch (error) {
      console.log('Biblioteca serialport não disponível, usando apenas PowerShell');
    }
  }

  /**
   * Processa dados da porta do PowerShell
   */
  private parsePortData(portData: any): SerialPortInfo | null {
    try {
      const portInfo: SerialPortInfo = {
        path: portData.DeviceID,
        friendlyName: portData.Name,
        manufacturer: portData.Manufacturer,
        pnpId: portData.PNPDeviceID,
        status: 'available'
      };

      // Extrair Vendor ID e Product ID se disponível
      if (portData.PNPDeviceID) {
        const vidMatch = portData.PNPDeviceID.match(/VID_([0-9A-Fa-f]{4})/);
        const pidMatch = portData.PNPDeviceID.match(/PID_([0-9A-Fa-f]{4})/);
        
        if (vidMatch) portInfo.vendorId = vidMatch[1];
        if (pidMatch) portInfo.productId = pidMatch[1];
      }

      return portInfo;
    } catch (error) {
      console.error('Erro ao processar dados da porta:', error);
      return null;
    }
  }

  /**
   * Testa conexão com porta
   */
  private async testPortConnection(portPath: string): Promise<boolean> {
    try {
      // Implementação usando serialport para teste rápido
      const { SerialPort } = require('serialport');
      
      return new Promise((resolve) => {
        const testPort = new SerialPort({
          path: portPath,
          baudRate: 9600,
          autoOpen: false
        });

        const timeout = setTimeout(() => {
          testPort.close(() => resolve(false));
        }, 2000);

        testPort.open((error: any) => {
          clearTimeout(timeout);
          if (error) {
            resolve(false);
          } else {
            testPort.close(() => resolve(true));
          }
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Cria conexão serial
   */
  private async createSerialConnection(portPath: string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const { SerialPort } = require('serialport');
        
        const port = new SerialPort(options);

        port.on('open', () => {
          console.log(`Porta ${portPath} aberta com sucesso`);
          resolve(port);
        });

        port.on('error', (error: any) => {
          console.error(`Erro na porta ${portPath}:`, error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fecha conexão serial
   */
  private async closeSerialConnection(connection: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (connection && typeof connection.close === 'function') {
        connection.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Escreve dados na conexão
   */
  private async writeToConnection(connection: any, data: string | Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      connection.write(data, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Lê dados da conexão
   */
  private async readFromConnection(connection: any, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      
      const timeoutHandle = setTimeout(() => {
        connection.removeListener('data', dataHandler);
        reject(new Error('Timeout na leitura'));
      }, timeout);

      const dataHandler = (data: Buffer) => {
        buffer += data.toString();
        // Para esta implementação, retorna quando recebe qualquer dado
        // Você pode modificar para aguardar um terminador específico
        clearTimeout(timeoutHandle);
        connection.removeListener('data', dataHandler);
        resolve(buffer);
      };

      connection.on('data', dataHandler);
    });
  }

  /**
   * Configura listener de dados
   */
  private setupDataListener(connection: any, callback: (data: string) => void): void {
    connection.on('data', (data: Buffer) => {
      callback(data.toString());
    });
  }

  /**
   * Remove listener de dados
   */
  private removeDataListenerFromConnection(connection: any): void {
    connection.removeAllListeners('data');
  }
}