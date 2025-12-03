import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import { DeviceService } from '../services/DeviceService';
import { PrinterService } from '../services/PrinterService';
import { CameraService } from '../services/CameraService';
import { USBService } from '../services/USBService';
import { SerialService } from '../services/SerialService';
import { ApiServer } from '../api/ApiServer';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private printerService: PrinterService;
  private cameraService: CameraService;
  private usbService: USBService;
  private serialService: SerialService;
  private apiServer: ApiServer;

  constructor() {
    // Inicialização dos serviços
    this.printerService = new PrinterService();
    this.cameraService = new CameraService();
    this.usbService = new USBService();
    this.serialService = new SerialService();
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
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Arquivo',
        submenu: [
          {
            label: 'Configurações',
            click: () => {
              this.openConfigDialog();
            }
          },
          { type: 'separator' },
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
            label: 'Listar Impressoras',
            click: () => {
              this.listPrinters();
            }
          },
          {
            label: 'Testar Câmera',
            click: () => {
              this.testCamera();
            }
          },
          {
            label: 'Verificar USB',
            click: () => {
              this.checkUSBDevices();
            }
          }
        ]
      },
      {
        label: 'Ajuda',
        submenu: [
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