import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Suprimir warnings de N-API das bibliotecas opcionais (USB, Serial, etc.)
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning: any, ...args: any[]) => {
  if (typeof warning === 'string' && warning.includes('N-API')) return;
  if (warning?.message?.includes('N-API')) return;
  return originalEmitWarning.call(process, warning, ...args);
};

// Carrega variáveis de ambiente do arquivo .env automaticamente
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { DeviceService } from '../services/DeviceService';
import { PrinterService } from '../services/PrinterService';
import { CameraService } from '../services/CameraService';
import { USBService } from '../services/USBService';
import { SerialService } from '../services/SerialService';
import { ScannerService } from '../services/ScannerService';
import { ApiServer } from '../api/ApiServer';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private printerService: PrinterService;
  private cameraService: CameraService;
  private usbService: USBService;
  private serialService: SerialService;
  private scannerService: ScannerService;
  private apiServer: ApiServer;

  constructor() {
    // Inicialização dos serviços
    this.printerService = new PrinterService();
    this.cameraService = new CameraService();
    this.usbService = new USBService();
    this.serialService = new SerialService();
    this.scannerService = new ScannerService();
    this.apiServer = new ApiServer();

    this.initializeApp();
    this.setupIpcHandlers();
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.apiServer.start();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../renderer/preload.js'),
        webSecurity: true
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false
    });

    // Maximiza a janela ao iniciar
    this.mainWindow.maximize();

    // Carrega a URL da aplicação web ou arquivo local
    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    this.mainWindow.loadURL(webUrl);

    // Mostra a janela quando estiver pronta
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Abre links externos no navegador padrão
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Development tools
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // Atalhos de teclado globais
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // Ctrl+Shift+S para abrir diálogo de scanner
      if (input.control && input.shift && input.key.toLowerCase() === 's') {
        this.scannerService.openScannerDialog(this.mainWindow!);
      }
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Arquivo',
        submenu: [
          // {
          //   label: 'Configurações',
          //   click: () => {
          //     this.openConfigDialog();
          //   }
          // },
          // { type: 'separator' },
          {
            label: 'Sair',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Dispositivos',
        submenu: [
          {
            label: 'Configurar Scanner',
            click: () => {
              this.scannerService.openScannerDialog(this.mainWindow!);
            }
          }
          // {
          //   label: 'Listar Impressoras',
          //   click: () => {
          //     this.listPrinters();
          //   }
          // },
          // {
          //   label: 'Testar Câmera',
          //   click: () => {
          //     this.testCamera();
          //   }
          // },
          // {
          //   label: 'Verificar USB',
          //   click: () => {
          //     this.checkUSBDevices();
          //   }
          // }
        ]
      },
      {
        label: 'Ajuda',
        submenu: [
          {
            label: 'Atalhos',
            click: () => {
              this.showShortcuts();
            }
          },
          { type: 'separator' },
          {
            label: 'Sobre',
            click: () => {
              this.showAbout();
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Handlers para dispositivos
    ipcMain.handle('get-printers', async () => {
      return await this.printerService.getPrinters();
    });

    ipcMain.handle('print-document', async (event, printData) => {
      return await this.printerService.print(printData);
    });

    ipcMain.handle('capture-photo', async () => {
      return await this.cameraService.capturePhoto();
    });

    ipcMain.handle('get-cameras', async () => {
      return await this.cameraService.getCameras();
    });

    ipcMain.handle('get-usb-devices', async () => {
      return await this.usbService.getDevices();
    });

    ipcMain.handle('get-serial-ports', async () => {
      return await this.serialService.getPorts();
    });

    ipcMain.handle('serial-write', async (event, port, data) => {
      return await this.serialService.write(port, data);
    });

    ipcMain.handle('get-scanners', async () => {
      return await this.scannerService.getScanners();
    });

    ipcMain.handle('check-scanner-connection', async () => {
      return await this.scannerService.checkScannerConnection();
    });

    ipcMain.handle('set-default-scanner', async (event, scannerId) => {
      return await this.scannerService.setDefaultScanner(scannerId);
    });

    ipcMain.handle('test-scanner', async (event, scannerId) => {
      return await this.scannerService.testScanner(scannerId);
    });

    ipcMain.handle('scan-document', async (event, scannerId, options) => {
      return await this.scannerService.scan(scannerId, options);
    });

    ipcMain.handle('open-scanner-dialog', async () => {
      await this.scannerService.openScannerDialog(this.mainWindow!);
    });

    ipcMain.handle('start-scanner', async (event, duplex) => {
      const result = await this.scannerService.startScanning(duplex);
      // Envia resposta de volta para o renderer
      this.mainWindow?.webContents.send('scanner-response', result);
    });

    // Handlers gerais
    ipcMain.handle('show-message-box', async (event, options) => {
      const result = await dialog.showMessageBox(this.mainWindow!, options);
      return result;
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options);
      return result;
    });
  }

  private async openConfigDialog(): Promise<void> {
    const configWindow = new BrowserWindow({
      width: 600,
      height: 400,
      parent: this.mainWindow!,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../renderer/preload.js')
      }
    });

    configWindow.loadFile(path.join(__dirname, '../renderer/config.html'));
  }

  private async listPrinters(): Promise<void> {
    const printers = await this.printerService.getPrinters();
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Impressoras Disponíveis',
      message: `Encontradas ${printers.length} impressoras:\n${printers.map(p => p.name).join('\n')}`
    });
  }

  private async testCamera(): Promise<void> {
    try {
      const cameras = await this.cameraService.getCameras();
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Câmeras Disponíveis',
        message: `Encontradas ${cameras.length} câmeras disponíveis`
      });
    } catch (error) {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'error',
        title: 'Erro na Câmera',
        message: `Erro ao acessar câmera: ${error}`
      });
    }
  }

  private async checkUSBDevices(): Promise<void> {
    const devices = await this.usbService.getDevices();
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Dispositivos USB',
      message: `Encontrados ${devices.length} dispositivos USB conectados`
    });
  }

  private showShortcuts(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Atalhos de Teclado',
      message: 'Atalhos Disponíveis:',
      detail: 'Ctrl+Shift+S - Abrir configurações de scanner\nCtrl+Q - Sair da aplicação'
    });
  }

  private showAbout(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Sobre',
      message: 'Intranet Desktop v1.0.0',
      detail: 'Aplicativo Electron para integração com dispositivos do sistema\nDesenvolvido por BS TECH'
    });
  }
}

// Inicializar aplicação
new MainProcess();