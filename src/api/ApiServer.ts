import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer, Server } from 'http';
import { PrinterService } from '../services/PrinterService';
import { CameraService } from '../services/CameraService';
import { USBService } from '../services/USBService';
import { SerialService } from '../services/SerialService';

interface ApiConfig {
  port: number;
  allowedOrigins: string[];
  apiPrefix: string;
}

/**
 * Servidor de API REST e WebSocket para comunicação com aplicação web
 */
export class ApiServer {
  private app: Express;
  private server: Server;
  private io: SocketIOServer;
  private config: ApiConfig;
  
  private printerService: PrinterService;
  private cameraService: CameraService;
  private usbService: USBService;
  private serialService: SerialService;

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      port: 8080,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:8000'],
      apiPrefix: '/api/v1',
      ...config
    };

    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.allowedOrigins,
        methods: ["GET", "POST"]
      }
    });

    // Inicializar serviços
    this.printerService = new PrinterService();
    this.cameraService = new CameraService();
    this.usbService = new USBService();
    this.serialService = new SerialService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Inicia o servidor de API
   */
  async start(): Promise<void> {
    try {
      // Inicializar serviços
      await this.initializeServices();

      // Iniciar servidor
      this.server.listen(this.config.port, () => {
        console.log(`Servidor de API iniciado na porta ${this.config.port}`);
        console.log(`Endpoints disponíveis em http://localhost:${this.config.port}${this.config.apiPrefix}`);
      });
    } catch (error) {
      console.error('Erro ao iniciar servidor de API:', error);
      throw error;
    }
  }

  /**
   * Para o servidor de API
   */
  async stop(): Promise<void> {
    try {
      // Finalizar serviços
      await this.cleanupServices();

      // Fechar servidor
      this.server.close();
      console.log('Servidor de API finalizado');
    } catch (error) {
      console.error('Erro ao parar servidor de API:', error);
    }
  }

  /**
   * Configura middleware do Express
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.allowedOrigins,
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  }

  /**
   * Configura rotas da API
   */
  private setupRoutes(): void {
    const router = express.Router();

    // Rotas de impressoras
    this.setupPrinterRoutes(router);

    // Rotas de câmeras
    this.setupCameraRoutes(router);

    // Rotas de USB
    this.setupUSBRoutes(router);

    // Rotas de portas seriais
    this.setupSerialRoutes(router);

    // Usar router com prefixo
    this.app.use(this.config.apiPrefix, router);

    // Handler de erro
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Erro na API:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    });
  }

  /**
   * Configura rotas de impressoras
   */
  private setupPrinterRoutes(router: express.Router): void {
    // Listar impressoras
    router.get('/printers', async (req: Request, res: Response) => {
      try {
        const printers = await this.printerService.getPrinters();
        res.json({ success: true, data: printers });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      }
    });

    // Imprimir documento
    router.post('/printers/print', async (req: Request, res: Response) => {
      try {
        const { content, type, options } = req.body;
        const result = await this.printerService.print({ content, type, options });
        res.json({ success: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Testar impressora
    router.get('/printers/:name/test', async (req: Request, res: Response) => {
      try {
        const { name } = req.params;
        const result = await this.printerService.testDevice(name);
        res.json({ success: true, available: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  /**
   * Configura rotas de câmeras
   */
  private setupCameraRoutes(router: express.Router): void {
    // Listar câmeras
    router.get('/cameras', async (req: Request, res: Response) => {
      try {
        const cameras = await this.cameraService.getCameras();
        res.json({ success: true, data: cameras });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Capturar foto
    router.post('/cameras/:id/capture', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const options = req.body;
        const result = await this.cameraService.capturePhoto(id, options);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Iniciar stream de vídeo
    router.post('/cameras/:id/stream/start', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const options = req.body;
        const streamUrl = await this.cameraService.startVideoStream(id, options);
        res.json({ success: true, streamUrl });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Parar stream de vídeo
    router.post('/cameras/:id/stream/stop', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        await this.cameraService.stopVideoStream(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  /**
   * Configura rotas USB
   */
  private setupUSBRoutes(router: express.Router): void {
    // Listar dispositivos USB
    router.get('/usb/devices', async (req: Request, res: Response) => {
      try {
        const devices = await this.usbService.getDevices();
        res.json({ success: true, data: devices });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Obter informações de dispositivo específico
    router.get('/usb/devices/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const device = await this.usbService.getDeviceDetails(id);
        res.json({ success: true, data: device });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Filtrar por classe de dispositivo
    router.get('/usb/devices/class/:class', async (req: Request, res: Response) => {
      try {
        const { class: deviceClass } = req.params;
        const devices = await this.usbService.getDevicesByClass(deviceClass);
        res.json({ success: true, data: devices });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  /**
   * Configura rotas de comunicação serial
   */
  private setupSerialRoutes(router: express.Router): void {
    // Listar portas seriais
    router.get('/serial/ports', async (req: Request, res: Response) => {
      try {
        const ports = await this.serialService.getPorts();
        res.json({ success: true, data: ports });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Abrir porta serial
    router.post('/serial/ports/:port/open', async (req: Request, res: Response) => {
      try {
        const { port } = req.params;
        const options = req.body;
        const result = await this.serialService.openPort(port, options);
        res.json({ success: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Fechar porta serial
    router.post('/serial/ports/:port/close', async (req: Request, res: Response) => {
      try {
        const { port } = req.params;
        const result = await this.serialService.closePort(port);
        res.json({ success: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Escrever dados na porta serial
    router.post('/serial/ports/:port/write', async (req: Request, res: Response) => {
      try {
        const { port } = req.params;
        const { data } = req.body;
        const result = await this.serialService.write(port, data);
        res.json({ success: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Ler dados da porta serial
    router.get('/serial/ports/:port/read', async (req: Request, res: Response) => {
      try {
        const { port } = req.params;
        const timeout = parseInt(req.query.timeout as string) || 5000;
        const data = await this.serialService.read(port, timeout);
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  /**
   * Configura WebSocket para comunicação em tempo real
   */
  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log(`Cliente WebSocket conectado: ${socket.id}`);

      // Eventos de dispositivos USB
      socket.on('monitor-usb', () => {
        this.usbService.monitorDeviceChanges((event, device) => {
          socket.emit('usb-device-event', { event, device });
        });
      });

      // Eventos de porta serial
      socket.on('monitor-serial', (portPath) => {
        this.serialService.onData(portPath, (data) => {
          socket.emit('serial-data', { port: portPath, data });
        });
      });

      // Eventos de câmera
      socket.on('monitor-camera', () => {
        // Implementar monitoramento de câmeras se necessário
      });

      socket.on('disconnect', () => {
        console.log(`Cliente WebSocket desconectado: ${socket.id}`);
      });
    });
  }

  /**
   * Inicializa todos os serviços
   */
  private async initializeServices(): Promise<void> {
    try {
      await Promise.all([
        this.printerService.initialize(),
        this.cameraService.initialize(),
        this.usbService.initialize(),
        this.serialService.initialize()
      ]);

      console.log('Todos os serviços inicializados com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar serviços:', error);
      throw error;
    }
  }

  /**
   * Finaliza todos os serviços
   */
  private async cleanupServices(): Promise<void> {
    try {
      await Promise.all([
        this.printerService.cleanup(),
        this.cameraService.cleanup(),
        this.usbService.cleanup(),
        this.serialService.cleanup()
      ]);

      console.log('Todos os serviços finalizados com sucesso');
    } catch (error) {
      console.error('Erro ao finalizar serviços:', error);
    }
  }

  /**
   * Obtém configurações atuais
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configurações
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
