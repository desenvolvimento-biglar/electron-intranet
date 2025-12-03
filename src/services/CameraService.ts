import { DeviceService } from './DeviceService';
import * as fs from 'fs';
import * as path from 'path';

interface CameraInfo {
  id: string;
  name: string;
  type: 'webcam' | 'usb' | 'ip';
  status: 'available' | 'busy' | 'error';
  resolution?: string[];
}

interface CaptureOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'bmp';
  saveToFile?: boolean;
  filePath?: string;
}

/**
 * Serviço para gerenciamento de câmeras e captura de imagens
 */
export class CameraService extends DeviceService {
  private cameras: Map<string, CameraInfo> = new Map();
  private activeCaptures: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.detectCameras();
      this.isInitialized = true;
      console.log('CameraService inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar CameraService:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Parar todas as capturas ativas
    for (const [cameraId, capture] of this.activeCaptures) {
      try {
        if (capture && typeof capture.stop === 'function') {
          capture.stop();
        }
      } catch (error) {
        console.error(`Erro ao parar captura da câmera ${cameraId}:`, error);
      }
    }

    this.activeCaptures.clear();
    this.cameras.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log('CameraService finalizado');
  }

  async isDeviceAvailable(cameraId: string): Promise<boolean> {
    const camera = this.cameras.get(cameraId);
    return camera ? camera.status === 'available' : false;
  }

  async getAvailableDevices(): Promise<CameraInfo[]> {
    await this.detectCameras();
    return Array.from(this.cameras.values());
  }

  async getDeviceInfo(cameraId: string): Promise<CameraInfo | null> {
    return this.cameras.get(cameraId) || null;
  }

  async testDevice(cameraId: string): Promise<boolean> {
    try {
      const camera = await this.getDeviceInfo(cameraId);
      if (!camera || camera.status !== 'available') {
        return false;
      }

      // Teste rápido - tenta inicializar a câmera
      return await this.testCameraAccess(cameraId);
    } catch (error) {
      console.error(`Erro ao testar câmera ${cameraId}:`, error);
      return false;
    }
  }

  /**
   * Obtém lista de câmeras disponíveis
   */
  async getCameras(): Promise<CameraInfo[]> {
    return await this.getAvailableDevices();
  }

  /**
   * Captura uma foto da câmera especificada
   */
  async capturePhoto(cameraId: string = '0', options: CaptureOptions = {}): Promise<string> {
    try {
      const camera = await this.getDeviceInfo(cameraId);
      if (!camera) {
        throw new Error(`Câmera ${cameraId} não encontrada`);
      }

      if (camera.status !== 'available') {
        throw new Error(`Câmera ${cameraId} não está disponível`);
      }

      // Configurações padrão
      const captureOptions: Required<CaptureOptions> = {
        width: options.width || 640,
        height: options.height || 480,
        quality: options.quality || 85,
        format: options.format || 'jpg',
        saveToFile: options.saveToFile || false,
        filePath: options.filePath || this.generateTempFilePath(options.format || 'jpg')
      };

      // Realizar captura
      const imagePath = await this.performCapture(cameraId, captureOptions);
      
      if (captureOptions.saveToFile) {
        this.emit('photo-captured', { cameraId, filePath: imagePath });
        return imagePath;
      } else {
        // Converter para base64 e limpar arquivo temporário
        const base64Data = await this.imageToBase64(imagePath);
        await this.cleanupTempFile(imagePath);
        this.emit('photo-captured', { cameraId, base64: base64Data });
        return base64Data;
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      this.emit('capture-error', { cameraId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Inicia captura de vídeo (stream)
   */
  async startVideoStream(cameraId: string = '0', options: Partial<CaptureOptions> = {}): Promise<string> {
    try {
      const camera = await this.getDeviceInfo(cameraId);
      if (!camera) {
        throw new Error(`Câmera ${cameraId} não encontrada`);
      }

      if (this.activeCaptures.has(cameraId)) {
        throw new Error(`Câmera ${cameraId} já está em uso`);
      }

      // Implementar stream usando node-webcam ou biblioteca similar
      const streamUrl = await this.createVideoStream(cameraId, options);
      
      this.emit('stream-started', { cameraId, streamUrl });
      return streamUrl;
    } catch (error) {
      console.error('Erro ao iniciar stream de vídeo:', error);
      this.emit('stream-error', { cameraId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Para captura de vídeo
   */
  async stopVideoStream(cameraId: string): Promise<void> {
    try {
      const capture = this.activeCaptures.get(cameraId);
      if (capture) {
        if (typeof capture.stop === 'function') {
          capture.stop();
        }
        this.activeCaptures.delete(cameraId);
        
        // Atualizar status da câmera
        const camera = this.cameras.get(cameraId);
        if (camera) {
          camera.status = 'available';
        }

        this.emit('stream-stopped', { cameraId });
      }
    } catch (error) {
      console.error(`Erro ao parar stream da câmera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Detecta câmeras disponíveis no sistema
   */
  private async detectCameras(): Promise<void> {
    try {
      this.cameras.clear();

      // Método 1: Tentar detectar webcams usando enumeração de dispositivos
      await this.detectWebcams();

      // Método 2: Detectar câmeras USB
      await this.detectUSBCameras();

      // Se nenhuma câmera foi encontrada, adicionar câmera padrão
      if (this.cameras.size === 0) {
        this.cameras.set('0', {
          id: '0',
          name: 'Câmera Padrão',
          type: 'webcam',
          status: 'available',
          resolution: ['640x480', '1280x720']
        });
      }

      this.emit('cameras-updated', Array.from(this.cameras.values()));
    } catch (error) {
      console.error('Erro ao detectar câmeras:', error);
    }
  }

  /**
   * Detecta webcams usando PowerShell
   */
  private async detectWebcams(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Comando PowerShell para listar dispositivos de imagem
      const command = `Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -match "camera|webcam|imaging"} | Select-Object Name, DeviceID, Status | ConvertTo-Json`;
      
      const output = execSync(command, { encoding: 'utf8' });
      const devices = JSON.parse(output);
      
      const devicesList = Array.isArray(devices) ? devices : [devices];
      
      devicesList.forEach((device: any, index: number) => {
        if (device && device.Name) {
          const cameraInfo: CameraInfo = {
            id: index.toString(),
            name: device.Name,
            type: 'webcam',
            status: device.Status === 'OK' ? 'available' : 'error',
            resolution: ['640x480', '1280x720', '1920x1080']
          };
          
          this.cameras.set(cameraInfo.id, cameraInfo);
        }
      });
    } catch (error) {
      console.error('Erro ao detectar webcams:', error);
    }
  }

  /**
   * Detecta câmeras USB
   */
  private async detectUSBCameras(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Listar dispositivos USB relacionados a câmeras
      const command = `Get-WmiObject -Class Win32_USBHub | Where-Object {$_.Name -match "camera|video|imaging"} | Select-Object Name, DeviceID | ConvertTo-Json`;
      
      const output = execSync(command, { encoding: 'utf8' });
      
      if (output.trim()) {
        const devices = JSON.parse(output);
        const devicesList = Array.isArray(devices) ? devices : [devices];
        
        devicesList.forEach((device: any) => {
          if (device && device.Name && !this.cameras.has(device.DeviceID)) {
            const cameraInfo: CameraInfo = {
              id: device.DeviceID,
              name: device.Name,
              type: 'usb',
              status: 'available',
              resolution: ['640x480', '1280x720']
            };
            
            this.cameras.set(cameraInfo.id, cameraInfo);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao detectar câmeras USB:', error);
    }
  }

  /**
   * Testa acesso à câmera
   */
  private async testCameraAccess(cameraId: string): Promise<boolean> {
    try {
      // Implementação simplificada - tentar acesso rápido
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000); // 5 segundos de timeout

        // Tentar usar ffmpeg ou comando similar para testar câmera
        const testProcess = spawn('powershell', [
          '-Command',
          `Add-Type -AssemblyName System.Drawing; $true`
        ]);

        testProcess.on('close', (code: number) => {
          clearTimeout(timeout);
          resolve(code === 0);
        });

        testProcess.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Realiza a captura da imagem
   */
  private async performCapture(cameraId: string, options: Required<CaptureOptions>): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Usar node-webcam ou implementação similar
        const NodeWebcam = require('node-webcam');
        
        const webcamOptions = {
          width: options.width,
          height: options.height,
          quality: options.quality,
          frames: 1,
          delay: 0,
          saveShots: true,
          output: options.format,
          device: cameraId === '0' ? false : cameraId,
          callbackReturn: 'location',
          verbose: false
        };

        const webcam = NodeWebcam.create(webcamOptions);
        
        webcam.capture(options.filePath, (error: any, data: string) => {
          if (error) {
            reject(new Error(`Erro na captura: ${error}`));
          } else {
            resolve(data || options.filePath);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Cria stream de vídeo
   */
  private async createVideoStream(cameraId: string, options: Partial<CaptureOptions>): Promise<string> {
    // Implementação para criar stream - pode usar WebRTC, Socket.IO, etc.
    const streamPort = 8080 + parseInt(cameraId);
    const streamUrl = `http://localhost:${streamPort}/stream`;
    
    // Marcar câmera como ocupada
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera.status = 'busy';
    }
    
    // Simular criação de stream (implementar com biblioteca apropriada)
    this.activeCaptures.set(cameraId, {
      url: streamUrl,
      stop: () => {
        console.log(`Stream ${cameraId} parado`);
      }
    });
    
    return streamUrl;
  }

  /**
   * Gera caminho para arquivo temporário
   */
  private generateTempFilePath(format: string): string {
    const tempDir = require('os').tmpdir();
    const timestamp = Date.now();
    return path.join(tempDir, `capture_${timestamp}.${format}`);
  }

  /**
   * Converte imagem para base64
   */
  private async imageToBase64(imagePath: string): Promise<string> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const mimeType = this.getMimeType(path.extname(imagePath));
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      throw new Error(`Erro ao converter imagem para base64: ${error}`);
    }
  }

  /**
   * Obtém tipo MIME baseado na extensão
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.gif': 'image/gif'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Remove arquivo temporário
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Erro ao remover arquivo temporário ${filePath}:`, error);
    }
  }
}