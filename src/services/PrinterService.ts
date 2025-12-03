import { DeviceService } from './DeviceService';

interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
  description?: string;
}

interface PrintOptions {
  printer?: string;
  copies?: number;
  paperSize?: string;
  orientation?: 'portrait' | 'landscape';
  quality?: 'draft' | 'normal' | 'high';
}

/**
 * Serviço para gerenciamento de impressoras
 */
export class PrinterService extends DeviceService {
  private printers: Map<string, PrinterInfo> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.refreshPrinterList();
      this.isInitialized = true;
      console.log('PrinterService inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar PrinterService:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.printers.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log('PrinterService finalizado');
  }

  async isDeviceAvailable(printerName: string): Promise<boolean> {
    await this.refreshPrinterList();
    return this.printers.has(printerName);
  }

  async getAvailableDevices(): Promise<PrinterInfo[]> {
    await this.refreshPrinterList();
    return Array.from(this.printers.values());
  }

  async getDeviceInfo(printerName: string): Promise<PrinterInfo | null> {
    await this.refreshPrinterList();
    return this.printers.get(printerName) || null;
  }

  async testDevice(printerName: string): Promise<boolean> {
    try {
      const printer = await this.getDeviceInfo(printerName);
      if (!printer) return false;

      // Teste simples - verifica se a impressora está disponível e não com erro
      return printer.status !== 'Error' && printer.status !== 'Offline';
    } catch (error) {
      console.error(`Erro ao testar impressora ${printerName}:`, error);
      return false;
    }
  }

  /**
   * Obtém lista de impressoras do sistema
   */
  async getPrinters(): Promise<PrinterInfo[]> {
    return await this.getAvailableDevices();
  }

  /**
   * Imprime um documento
   */
  async print(printData: {
    content: string;
    type?: 'text' | 'html' | 'pdf';
    options?: PrintOptions;
  }): Promise<boolean> {
    try {
      const { content, type = 'text', options = {} } = printData;

      // Valida se existe impressora selecionada ou padrão
      let targetPrinter = options.printer;
      if (!targetPrinter) {
        const printers = await this.getPrinters();
        const defaultPrinter = printers.find(p => p.isDefault);
        if (!defaultPrinter) {
          throw new Error('Nenhuma impressora padrão encontrada');
        }
        targetPrinter = defaultPrinter.name;
      }

      // Verifica se a impressora está disponível
      const isAvailable = await this.isDeviceAvailable(targetPrinter);
      if (!isAvailable) {
        throw new Error(`Impressora ${targetPrinter} não está disponível`);
      }

      // Implementar lógica de impressão baseada no tipo
      switch (type) {
        case 'text':
          return await this.printText(content, targetPrinter, options);
        case 'html':
          return await this.printHTML(content, targetPrinter, options);
        case 'pdf':
          return await this.printPDF(content, targetPrinter, options);
        default:
          throw new Error(`Tipo de impressão não suportado: ${type}`);
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      this.emit('print-error', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Imprime texto simples
   */
  private async printText(content: string, printer: string, options: PrintOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Implementação usando bibliotecas nativas do Windows
        const { spawn } = require('child_process');
        
        // Usar comando nativo do Windows para impressão
        const printProcess = spawn('powershell', [
          '-Command',
          `"${content}" | Out-Printer -Name "${printer}"`
        ]);

        printProcess.on('close', (code: number) => {
          if (code === 0) {
            this.emit('print-success', { printer, content: 'text' });
            resolve(true);
          } else {
            reject(new Error(`Processo de impressão falhou com código ${code}`));
          }
        });

        printProcess.on('error', (error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Imprime conteúdo HTML
   */
  private async printHTML(content: string, printer: string, options: PrintOptions): Promise<boolean> {
    // Para HTML, podemos usar uma webview temporária
    const { BrowserWindow } = require('electron');
    
    return new Promise((resolve, reject) => {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);

      printWindow.webContents.once('did-finish-load', () => {
        printWindow.webContents.print({
          deviceName: printer,
          copies: options.copies || 1,
          pageSize: options.paperSize || 'A4',
          landscape: options.orientation === 'landscape'
        }, (success: boolean, failureReason?: string) => {
          printWindow.close();
          if (success) {
            this.emit('print-success', { printer, content: 'html' });
            resolve(true);
          } else {
            reject(new Error(failureReason || 'Falha na impressão'));
          }
        });
      });
    });
  }

  /**
   * Imprime arquivo PDF
   */
  private async printPDF(filePath: string, printer: string, options: PrintOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const { spawn } = require('child_process');
        
        // Usar Adobe Reader ou SumatraPDF para imprimir PDF
        const printProcess = spawn('powershell', [
          '-Command',
          `Start-Process -FilePath "${filePath}" -ArgumentList "/t","/p","${printer}" -Wait`
        ]);

        printProcess.on('close', (code: number) => {
          if (code === 0) {
            this.emit('print-success', { printer, content: 'pdf' });
            resolve(true);
          } else {
            reject(new Error(`Falha na impressão do PDF com código ${code}`));
          }
        });

        printProcess.on('error', (error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Atualiza a lista de impressoras disponíveis
   */
  private async refreshPrinterList(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Usar PowerShell para obter lista de impressoras
      const command = 'Get-Printer | ConvertTo-Json';
      const output = execSync(command, { encoding: 'utf8' });
      const printersData = JSON.parse(output);
      
      this.printers.clear();
      
      const printersList = Array.isArray(printersData) ? printersData : [printersData];
      
      printersList.forEach((printer: any) => {
        const printerInfo: PrinterInfo = {
          name: printer.Name,
          status: printer.PrinterStatus || 'Unknown',
          isDefault: printer.Default || false,
          description: printer.Comment || printer.Description
        };
        
        this.printers.set(printer.Name, printerInfo);
      });

      this.emit('printers-updated', Array.from(this.printers.values()));
    } catch (error) {
      console.error('Erro ao atualizar lista de impressoras:', error);
      // Em caso de erro, tentar método alternativo
      await this.fallbackPrinterList();
    }
  }

  /**
   * Método alternativo para listar impressoras
   */
  private async fallbackPrinterList(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Método alternativo usando wmic
      const command = 'wmic printer get Name,Status,Default /format:csv';
      const output = execSync(command, { encoding: 'utf8' });
      
      const lines = output.split('\n').filter((line: string) => line.trim() && !line.startsWith('Node'));
      
      this.printers.clear();
      
      lines.forEach((line: string) => {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const printerInfo: PrinterInfo = {
            name: parts[2]?.trim() || '',
            status: parts[3]?.trim() || 'Unknown',
            isDefault: parts[1]?.trim().toLowerCase() === 'true'
          };
          
          if (printerInfo.name) {
            this.printers.set(printerInfo.name, printerInfo);
          }
        }
      });
    } catch (error) {
      console.error('Erro no método alternativo de listagem de impressoras:', error);
    }
  }
}