import { DeviceService } from './DeviceService';

interface USBDeviceInfo {
  deviceId: string;
  vendorId: string;
  productId: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  deviceClass?: string;
  deviceSubclass?: string;
  status: 'connected' | 'disconnected' | 'error';
}

/**
 * Serviço para gerenciamento de dispositivos USB
 */
export class USBService extends DeviceService {
  private devices: Map<string, USBDeviceInfo> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.scanUSBDevices();
      this.startMonitoring();
      this.isInitialized = true;
      console.log('USBService inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar USBService:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.devices.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log('USBService finalizado');
  }

  async isDeviceAvailable(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    return device ? device.status === 'connected' : false;
  }

  async getAvailableDevices(): Promise<USBDeviceInfo[]> {
    await this.scanUSBDevices();
    return Array.from(this.devices.values()).filter(device => device.status === 'connected');
  }

  async getDeviceInfo(deviceId: string): Promise<USBDeviceInfo | null> {
    return this.devices.get(deviceId) || null;
  }

  async testDevice(deviceId: string): Promise<boolean> {
    try {
      const device = await this.getDeviceInfo(deviceId);
      return device ? device.status === 'connected' : false;
    } catch (error) {
      console.error(`Erro ao testar dispositivo USB ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * Obtém lista de dispositivos USB conectados
   */
  async getDevices(): Promise<USBDeviceInfo[]> {
    return await this.getAvailableDevices();
  }

  /**
   * Obtém informações detalhadas de um dispositivo específico
   */
  async getDeviceDetails(deviceId: string): Promise<any> {
    try {
      const device = await this.getDeviceInfo(deviceId);
      if (!device) {
        throw new Error(`Dispositivo ${deviceId} não encontrado`);
      }

      // Obter informações detalhadas usando WMI
      const details = await this.getWMIDeviceInfo(device.deviceId);
      return {
        ...device,
        ...details
      };
    } catch (error) {
      console.error(`Erro ao obter detalhes do dispositivo ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Monitora conexão/desconexão de dispositivos USB
   */
  async monitorDeviceChanges(callback: (event: 'connected' | 'disconnected', device: USBDeviceInfo) => void): Promise<void> {
    this.addEventListener('device-connected', (device: USBDeviceInfo) => {
      callback('connected', device);
    });

    this.addEventListener('device-disconnected', (device: USBDeviceInfo) => {
      callback('disconnected', device);
    });
  }

  /**
   * Para o monitoramento de dispositivos
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Escaneia dispositivos USB conectados
   */
  private async scanUSBDevices(): Promise<void> {
    try {
      const currentDevices = new Map(this.devices);
      const foundDevices = new Set<string>();

      // Método 1: Usar PowerShell/WMI
      await this.scanWithWMI(foundDevices);

      // Método 2: Tentar usar biblioteca usb (se disponível)
      await this.scanWithUSBLibrary(foundDevices);

      // Verificar dispositivos desconectados
      for (const [deviceId, device] of currentDevices) {
        if (!foundDevices.has(deviceId)) {
          device.status = 'disconnected';
          this.emit('device-disconnected', device);
        }
      }

      this.emit('devices-updated', Array.from(this.devices.values()));
    } catch (error) {
      console.error('Erro ao escanear dispositivos USB:', error);
    }
  }

  /**
   * Escaneia usando WMI (Windows Management Instrumentation)
   */
  private async scanWithWMI(foundDevices: Set<string>): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Comando PowerShell para obter dispositivos USB
      const command = `powershell.exe -Command "
        Get-CimInstance -ClassName Win32_USBControllerDevice | 
        ForEach-Object { 
          \\$device = Get-CimInstance -ClassName Win32_PnPEntity -Filter \\"DeviceID='\\$(\\$_.Dependent.Split('=')[1].Replace('\\\\\\"',''))'\\"
          if ($device) {
            @{
              DeviceID = $device.DeviceID
              Name = $device.Name
              Manufacturer = $device.Manufacturer
              Service = $device.Service
              Status = $device.Status
              ClassGuid = $device.ClassGuid
            }
          }
        } | ConvertTo-Json
      `;

      const output = execSync(command, { encoding: 'utf8' });
      
      if (output.trim()) {
        const devicesData = JSON.parse(output);
        const devicesList = Array.isArray(devicesData) ? devicesData : [devicesData];

        devicesList.forEach((deviceData: any) => {
          if (deviceData && deviceData.DeviceID) {
            const deviceInfo = this.parseWMIDevice(deviceData);
            if (deviceInfo) {
              this.devices.set(deviceInfo.deviceId, deviceInfo);
              foundDevices.add(deviceInfo.deviceId);
              
              // Verificar se é um novo dispositivo
              if (!this.devices.has(deviceInfo.deviceId)) {
                this.emit('device-connected', deviceInfo);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro no escaneamento WMI:', error);
    }
  }

  /**
   * Tenta usar biblioteca USB nativa
   */
  private async scanWithUSBLibrary(foundDevices: Set<string>): Promise<void> {
    try {
      // Tentar usar biblioteca 'usb' se disponível
      const usb = require('usb');
      
      const devices = usb.getDeviceList();
      
      devices.forEach((device: any) => {
        const deviceId = `${device.deviceDescriptor.idVendor}:${device.deviceDescriptor.idProduct}`;
        
        if (!foundDevices.has(deviceId)) {
          const deviceInfo: USBDeviceInfo = {
            deviceId: deviceId,
            vendorId: device.deviceDescriptor.idVendor.toString(16).padStart(4, '0'),
            productId: device.deviceDescriptor.idProduct.toString(16).padStart(4, '0'),
            deviceClass: device.deviceDescriptor.bDeviceClass?.toString(),
            deviceSubclass: device.deviceDescriptor.bDeviceSubClass?.toString(),
            status: 'connected'
          };

          // Tentar obter informações adicionais
          try {
            device.open();
            if (device.deviceDescriptor.iManufacturer) {
              deviceInfo.manufacturer = device.getStringDescriptor(device.deviceDescriptor.iManufacturer);
            }
            if (device.deviceDescriptor.iProduct) {
              deviceInfo.product = device.getStringDescriptor(device.deviceDescriptor.iProduct);
            }
            if (device.deviceDescriptor.iSerialNumber) {
              deviceInfo.serialNumber = device.getStringDescriptor(device.deviceDescriptor.iSerialNumber);
            }
            device.close();
          } catch (error) {
            // Ignorar erros de acesso aos descritores
          }

          this.devices.set(deviceId, deviceInfo);
          foundDevices.add(deviceId);
        }
      });
    } catch (error) {
      // Biblioteca USB não disponível ou erro - ignorar
      console.log('Biblioteca USB não disponível, usando apenas WMI');
    }
  }

  /**
   * Processa dados de dispositivo do WMI
   */
  private parseWMIDevice(deviceData: any): USBDeviceInfo | null {
    try {
      if (!deviceData.DeviceID) return null;

      // Extrair Vendor ID e Product ID do DeviceID
      const deviceIdMatch = deviceData.DeviceID.match(/VID_([0-9A-Fa-f]{4})&PID_([0-9A-Fa-f]{4})/);
      
      const deviceInfo: USBDeviceInfo = {
        deviceId: deviceData.DeviceID,
        vendorId: deviceIdMatch ? deviceIdMatch[1] : 'unknown',
        productId: deviceIdMatch ? deviceIdMatch[2] : 'unknown',
        manufacturer: deviceData.Manufacturer || undefined,
        product: deviceData.Name || undefined,
        status: deviceData.Status === 'OK' ? 'connected' : 'error'
      };

      return deviceInfo;
    } catch (error) {
      console.error('Erro ao processar dados do dispositivo WMI:', error);
      return null;
    }
  }

  /**
   * Obtém informações detalhadas via WMI
   */
  private async getWMIDeviceInfo(deviceId: string): Promise<any> {
    try {
      const { execSync } = require('child_process');
      
      const command = `powershell.exe -Command "Get-CimInstance -ClassName Win32_PnPEntity -Filter \\"DeviceID='${deviceId}'\\" | Select-Object * | ConvertTo-Json"`;

      const output = execSync(command, { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (error) {
      console.error('Erro ao obter informações WMI detalhadas:', error);
      return {};
    }
  }

  /**
   * Inicia monitoramento contínuo
   */
  private startMonitoring(): void {
    // Escanear a cada 5 segundos
    this.monitoringInterval = setInterval(() => {
      this.scanUSBDevices();
    }, 5000);
  }

  /**
   * Filtra dispositivos por classe
   */
  async getDevicesByClass(deviceClass: string): Promise<USBDeviceInfo[]> {
    const devices = await this.getAvailableDevices();
    return devices.filter(device => 
      device.deviceClass === deviceClass ||
      device.product?.toLowerCase().includes(deviceClass.toLowerCase())
    );
  }

  /**
   * Procura dispositivos por Vendor ID
   */
  async getDevicesByVendor(vendorId: string): Promise<USBDeviceInfo[]> {
    const devices = await this.getAvailableDevices();
    return devices.filter(device => 
      device.vendorId.toLowerCase() === vendorId.toLowerCase()
    );
  }

  /**
   * Procura dispositivos por Product ID
   */
  async getDevicesByProduct(productId: string): Promise<USBDeviceInfo[]> {
    const devices = await this.getAvailableDevices();
    return devices.filter(device => 
      device.productId.toLowerCase() === productId.toLowerCase()
    );
  }
}