import { dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../utils/ConfigManager';
import { spawn } from 'child_process';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

export interface ScannerInfo {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  type: string;
  isDefault: boolean;
}

export interface ScanOptions {
  resolution?: number; // DPI
  colorMode?: 'color' | 'grayscale' | 'monochrome';
  format?: 'pdf' | 'jpg' | 'png' | 'tiff';
  duplex?: boolean;
}

/**
 * Serviço para gerenciar scanners conectados ao sistema
 */
export class ScannerService {
  private configManager: ConfigManager;
  private connectedScanners: Map<string, ScannerInfo> = new Map();

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.initializeService();
  }

  /**
   * Inicializa o serviço de scanner
   */
  private async initializeService(): Promise<void> {
    try {
      await this.refreshScanners();
    } catch (error) {
      console.error('Erro ao inicializar serviço de scanner:', error);
    }
  }

  /**
   * Busca scanners disponíveis no sistema
   */
  public async getScanners(): Promise<ScannerInfo[]> {
    try {
      await this.refreshScanners();
      return Array.from(this.connectedScanners.values());
    } catch (error) {
      console.error('Erro ao obter scanners:', error);
      return [];
    }
  }

  /**
   * Atualiza lista de scanners conectados
   */
  private async refreshScanners(): Promise<void> {
    try {
      this.connectedScanners.clear();
      
      // Detecta scanners usando WIA no Windows
      const scanners = await this.detectWindowsScanners();
      
      scanners.forEach(scanner => {
        this.connectedScanners.set(scanner.id, scanner);
      });
      
      // Se não encontrou nenhum, adiciona um scanner simulado para testes
      if (scanners.length === 0) {
        const mockScanner: ScannerInfo = {
          id: 'mock-scanner-001',
          name: 'Scanner Simulado',
          status: 'available',
          type: 'document-feeder',
          isDefault: true
        };
        this.connectedScanners.set(mockScanner.id, mockScanner);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar lista de scanners:', error);
    }
  }

  /**
   * Detecta scanners no Windows usando WIA diretamente
   */
  private async detectWindowsScanners(): Promise<ScannerInfo[]> {
    return new Promise((resolve) => {
      try {
        // Usa WIA.DeviceManager para listar scanners (mais confiável)
        const psScript = `
          try {
            $dm = New-Object -ComObject WIA.DeviceManager
            $scanners = @()
            for ($i = 1; $i -le $dm.DeviceInfos.Count; $i++) {
              $d = $dm.DeviceInfos.Item($i)
              if ($d.Type -eq 1) {
                $name = $d.Properties.Item('Name').Value
                $id = $d.DeviceID
                $scanners += @{
                  id = $id
                  name = $name
                  type = 'wia'
                }
              }
            }
            if ($scanners.Count -gt 0) {
              $scanners | ConvertTo-Json -Compress
            } else {
              Write-Output "[]"
            }
          } catch {
            Write-Output "[]"
          }
        `;

        const ps = spawn('powershell.exe', ['-Command', psScript]);

        let output = '';
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });

        ps.on('close', (code) => {
          const scanners: ScannerInfo[] = [];
          
          try {
            const trimmed = output.trim();
            if (trimmed && trimmed !== '[]') {
              const parsed = JSON.parse(trimmed);
              const scannerArray = Array.isArray(parsed) ? parsed : [parsed];
              
              scannerArray.forEach((s: any, index: number) => {
                scanners.push({
                  id: s.id || `scanner-${Date.now()}-${index}`,
                  name: s.name || 'Scanner Desconhecido',
                  status: 'available',
                  type: s.type || 'document-feeder',
                  isDefault: index === 0
                });
              });
            }
          } catch (parseError) {
            console.error('Erro ao parsear scanners:', parseError);
          }
          
          resolve(scanners);
        });

        ps.on('error', () => {
          resolve([]);
        });

        // Timeout de 5 segundos para não travar
        setTimeout(() => {
          ps.kill();
          resolve([]);
        }, 5000);

      } catch (error) {
        resolve([]);
      }
    });
  }

  /**
   * Verifica se o scanner está conectado e pronto para uso
   */
  public async checkScannerConnection(): Promise<{ connected: boolean; scannerName?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        const psScript = `
          try {
            $dm = New-Object -ComObject WIA.DeviceManager
            $scanner = $null
            for ($i = 1; $i -le $dm.DeviceInfos.Count; $i++) {
              $d = $dm.DeviceInfos.Item($i)
              if ($d.Type -eq 1) {
                $scanner = $d
                break
              }
            }
            if ($scanner -eq $null) {
              Write-Output "NO_SCANNER"
              exit
            }
            
            $name = $scanner.Properties.Item('Name').Value
            
            # Tenta conectar rapidamente
            try {
              $device = $scanner.Connect()
              $itemCount = $device.Items.Count
              Write-Output "CONNECTED:$name"
            } catch {
              Write-Output "ERROR:Não foi possível conectar ao scanner $name"
            }
          } catch {
            Write-Output "ERROR:$($_.Exception.Message)"
          }
        `;

        const ps = spawn('powershell.exe', ['-Command', psScript]);

        let output = '';
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });

        ps.on('close', () => {
          const result = output.trim();
          
          if (result.startsWith('CONNECTED:')) {
            const scannerName = result.replace('CONNECTED:', '');
            resolve({ connected: true, scannerName });
          } else if (result === 'NO_SCANNER') {
            resolve({ connected: false, error: 'Nenhum scanner encontrado' });
          } else if (result.startsWith('ERROR:')) {
            resolve({ connected: false, error: result.replace('ERROR:', '') });
          } else {
            resolve({ connected: false, error: 'Erro desconhecido' });
          }
        });

        ps.on('error', (err) => {
          resolve({ connected: false, error: err.message });
        });

        // Timeout de 10 segundos
        setTimeout(() => {
          ps.kill();
          resolve({ connected: false, error: 'Timeout ao verificar scanner' });
        }, 10000);

      } catch (error: any) {
        resolve({ connected: false, error: error.message });
      }
    });
  }

  /**
   * Define um scanner como padrão
   */
  public async setDefaultScanner(scannerId: string): Promise<boolean> {
    try {
      if (this.connectedScanners.has(scannerId)) {
        // Atualiza configuração
        this.configManager.set('defaultScannerId', scannerId);
        
        // Atualiza status dos scanners
        this.connectedScanners.forEach(scanner => {
          scanner.isDefault = scanner.id === scannerId;
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao definir scanner padrão:', error);
      return false;
    }
  }

  /**
   * Obtém ID do scanner padrão
   */
  private getDefaultScannerId(): string | null {
    try {
      return this.configManager.get('defaultScannerId') || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Testa conexão com scanner
   */
  public async testScanner(scannerId: string): Promise<boolean> {
    try {
      const scanner = this.connectedScanners.get(scannerId);
      if (!scanner) {
        return false;
      }

      // Simula teste de conexão
      // Aqui você adicionaria lógica real de teste
      
      return scanner.status === 'available';
    } catch (error) {
      console.error('Erro ao testar scanner:', error);
      return false;
    }
  }

  /**
   * Realiza digitalização
   */
  public async scan(scannerId: string, options: ScanOptions = {}): Promise<string | null> {
    try {
      const scanner = this.connectedScanners.get(scannerId);
      if (!scanner || scanner.status !== 'available') {
        throw new Error('Scanner não disponível');
      }

      // Configurações padrão
      const scanOptions = {
        resolution: options.resolution || 300,
        colorMode: options.colorMode || 'color',
        format: options.format || 'pdf',
        duplex: options.duplex || false
      };

      // Aqui você integraria com a API real do scanner
      // Por exemplo, usando SANE, WIA ou SDK específico do fabricante
      
      // Simula digitalização e retorna caminho do arquivo
      const timestamp = Date.now();
      const fileName = `scan_${timestamp}.${scanOptions.format}`;
      const filePath = path.join(process.cwd(), 'scans', fileName);

      // Cria diretório se não existir
      const scanDir = path.dirname(filePath);
      if (!fs.existsSync(scanDir)) {
        fs.mkdirSync(scanDir, { recursive: true });
      }

      // Simula criação de arquivo (substituir por digitalização real)
      fs.writeFileSync(filePath, `Digitalização simulada - ${new Date().toISOString()}`);

      return filePath;
    } catch (error) {
      console.error('Erro ao digitalizar:', error);
      return null;
    }
  }

  /**
   * Inicia processo de escaneamento
   */
  public async startScanning(duplex: boolean): Promise<{ success: boolean; base64?: string; error?: string }> {
    try {
      // Primeiro verifica se o scanner está conectado e pronto
      console.log('Verificando conexão do scanner...');
      const connectionCheck = await this.checkScannerConnection();
      
      if (!connectionCheck.connected) {
        console.log('Scanner não conectado:', connectionCheck.error);
        return { success: false, error: connectionCheck.error || 'Scanner não conectado' };
      }
      
      console.log('Scanner conectado:', connectionCheck.scannerName);

      // Tenta escaneamento real
      const realScanResult = await this.performRealScan(duplex);
      
      // Retorna o resultado real (sucesso ou erro)
      return realScanResult;
      
    } catch (error) {
      console.error('Erro no escaneamento:', error);
      return { success: false, error: 'Erro durante o escaneamento' };
    }
  }

  /**
   * Executa escaneamento usando NAPS2 - gera PDF diretamente
   */
  private async performRealScan(duplex: boolean): Promise<{ success: boolean; base64?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        const timestamp = Date.now();
        const outputPath = path.join(process.cwd(), 'temp', `scan_${timestamp}.pdf`);
        
        // Cria diretório temp se não existir
        const tempDir = path.dirname(outputPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Caminho do NAPS2 Console
        const naps2Path = 'C:\\Program Files\\NAPS2\\NAPS2.Console.exe';
        
        if (!fs.existsSync(naps2Path)) {
          resolve({ success: false, error: 'NAPS2 não encontrado. Por favor, instale o NAPS2.' });
          return;
        }

        // Usa o perfil BrotherADF configurado no NAPS2 GUI
        const args = [
          '-o', outputPath,
          '--verbose',
          '-p', 'BrotherADF',  // Usa o perfil configurado
          '-f'  // Force overwrite
        ];

        console.log('Executando NAPS2:', naps2Path, args.join(' '));

        const naps2 = spawn(naps2Path, args);
        let stdout = '';
        let stderr = '';

        naps2.stdout.on('data', (data) => {
          stdout += data.toString();
          console.log('NAPS2:', data.toString().trim());
        });

        naps2.stderr.on('data', (data) => {
          stderr += data.toString();
          console.error('NAPS2 stderr:', data.toString().trim());
        });

        naps2.on('close', (code) => {
          console.log('NAPS2 finalizado com código:', code);
          
          if (code === 0 && fs.existsSync(outputPath)) {
            try {
              // Lê o PDF gerado pelo NAPS2 e converte para base64
              const pdfBuffer = fs.readFileSync(outputPath);
              const base64 = pdfBuffer.toString('base64');
              
              // Remove arquivo temporário
              fs.unlinkSync(outputPath);
              
              console.log('PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
              resolve({ success: true, base64 });
              
            } catch (error) {
              console.error('Erro ao ler PDF:', error);
              resolve({ success: false, error: 'Erro ao ler arquivo PDF gerado' });
            }
          } else {
            let errorMsg = 'Erro ao escanear documento';
            
            if (stderr.includes('No scanning device')) {
              errorMsg = 'Scanner não encontrado. Verifique se está conectado e ligado.';
            } else if (stderr.includes('No pages')) {
              errorMsg = 'Nenhuma página foi escaneada. Coloque um documento no scanner.';
            } else if (stderr) {
              errorMsg = stderr.trim();
            } else if (stdout.includes('Error')) {
              errorMsg = stdout.trim();
            }
            
            resolve({ success: false, error: errorMsg });
          }
        });

        naps2.on('error', (error) => {
          console.error('Erro ao executar NAPS2:', error);
          resolve({ success: false, error: `Erro ao executar NAPS2: ${error.message}` });
        });

        // Timeout de 2 minutos para scan
        setTimeout(() => {
          naps2.kill();
          resolve({ success: false, error: 'Timeout: escaneamento demorou muito' });
        }, 120000);

      } catch (error: any) {
        console.error('Erro geral no scan:', error);
        resolve({ success: false, error: `Erro: ${error.message}` });
      }
    });
  }

  /**
   * Cria PDF a partir de imagens escaneadas
   */
  /**
   * Cria PDF a partir de imagens escaneadas - DINÂMICO
   * Detecta o tamanho real de cada imagem e cria a página com o tamanho exato
   */
  private async createPdfFromImages(imagePaths: string[], outputPath: string): Promise<void> {
    try {
      // Tamanhos de papel padrão em pontos (72 pts = 1 polegada)
      const PAPER_SIZES = {
        'A4': { width: 595.28, height: 841.89 },
        'A3': { width: 841.89, height: 1190.55 },
        'Letter': { width: 612, height: 792 },
        'Legal': { width: 612, height: 1008 },
        'A5': { width: 419.53, height: 595.28 }
      };
      
      // Primeiro, processa todas as imagens para obter suas dimensões
      const imageDataList: { buffer: Buffer; width: number; height: number; paperSize: string }[] = [];
      
      for (const imagePath of imagePaths) {
        if (fs.existsSync(imagePath)) {
          try {
            const imageBuffer = fs.readFileSync(imagePath);
            
            if (imageBuffer.length > 0) {
              // Usa sharp para obter as dimensões reais da imagem
              const metadata = await sharp(imageBuffer).metadata();
              
              if (metadata.width && metadata.height) {
                // Usa o DPI real da imagem se disponível, senão usa 200 (padrão do scanner)
                const dpi = metadata.density || 200;
                
                // Converte pixels para pontos (72 pontos = 1 polegada)
                let widthInPoints = (metadata.width / dpi) * 72;
                let heightInPoints = (metadata.height / dpi) * 72;
                
                // Detecta o tamanho de papel mais próximo
                let bestMatch = 'A4';
                let bestDiff = Infinity;
                
                for (const [name, size] of Object.entries(PAPER_SIZES)) {
                  // Calcula diferença (considerando que pode estar em portrait ou landscape)
                  const diff1 = Math.abs(widthInPoints - size.width) + Math.abs(heightInPoints - size.height);
                  const diff2 = Math.abs(widthInPoints - size.height) + Math.abs(heightInPoints - size.width);
                  const diff = Math.min(diff1, diff2);
                  
                  if (diff < bestDiff) {
                    bestDiff = diff;
                    bestMatch = name;
                  }
                }
                
                // Usa o tamanho do papel padrão mais próximo
                const targetSize = PAPER_SIZES[bestMatch as keyof typeof PAPER_SIZES];
                
                // Determina se é portrait ou landscape
                const isLandscape = widthInPoints > heightInPoints;
                if (isLandscape) {
                  widthInPoints = targetSize.height;
                  heightInPoints = targetSize.width;
                } else {
                  widthInPoints = targetSize.width;
                  heightInPoints = targetSize.height;
                }
                
                console.log(`Imagem: ${metadata.width}x${metadata.height}px @ ${dpi} DPI -> ${bestMatch} (${widthInPoints.toFixed(1)}x${heightInPoints.toFixed(1)} pts)`);
                
                imageDataList.push({
                  buffer: imageBuffer,
                  width: widthInPoints,
                  height: heightInPoints,
                  paperSize: bestMatch
                });
              }
            }
          } catch (imgError) {
            console.error(`Erro ao processar imagem ${imagePath}:`, imgError);
          }
        }
      }
      
      if (imageDataList.length === 0) {
        throw new Error('Nenhuma imagem válida foi processada');
      }
      
      // Cria o PDF com páginas de tamanho dinâmico
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
          autoFirstPage: false,
          margin: 0
        });
        const stream = fs.createWriteStream(outputPath);
        
        doc.pipe(stream);
        
        for (const imageData of imageDataList) {
          // Adiciona página com o tamanho do papel padrão
          doc.addPage({
            size: [imageData.width, imageData.height],
            margin: 0
          });
          
          // Adiciona a imagem ajustando para caber na página (fit)
          doc.image(imageData.buffer, 0, 0, {
            fit: [imageData.width, imageData.height],
            align: 'center',
            valign: 'center'
          });
        }
        
        doc.end();
        
        stream.on('finish', () => {
          console.log(`PDF criado com ${imageDataList.length} páginas (tamanhos dinâmicos)`);
          resolve();
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      });
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  private cleanupTempFiles(tempDir: string, pdfPath: string): void {
    try {
      // Remove diretório de imagens temporárias
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      // Remove PDF após leitura
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (error) {
      console.log('Aviso: Não foi possível limpar arquivos temporários');
    }
  }

  /**
   * Gera um PDF base64 mockado (substituir por escaneamento real)
   */
  private generateMockPdfBase64(duplex: boolean): string {
    // PDF mínimo válido em base64
    const mockPdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Documento escaneado ${duplex ? '(Frente e Verso)' : '(Frente apenas)'}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF`;
    
    return btoa(mockPdf);
  }

  /**
   * Abre diálogo para configurar scanners
   */
  public async openScannerDialog(parentWindow: BrowserWindow): Promise<void> {
    try {
      const scanners = await this.getScanners();
      
      if (scanners.length === 0) {
        dialog.showMessageBox(parentWindow, {
          type: 'info',
          title: 'Scanners',
          message: 'Nenhum scanner encontrado',
          detail: 'Verifique se o scanner está conectado e ligado.'
        });
        return;
      }

      const scannerNames = scanners.map(s => `${s.name} ${s.isDefault ? '(Padrão)' : ''}`);
      
      const result = await dialog.showMessageBox(parentWindow, {
        type: 'question',
        title: 'Configurar Scanner',
        message: `Encontrados ${scanners.length} scanner(s):`,
        detail: scannerNames.join('\n'),
        buttons: ['Definir como Padrão', 'Testar Scanner', 'Cancelar'],
        defaultId: 0,
        cancelId: 2
      });

      if (result.response === 0) {
        // Definir como padrão
        const scanner = scanners[0]; // Por simplicidade, usa o primeiro
        const success = await this.setDefaultScanner(scanner.id);
        
        dialog.showMessageBox(parentWindow, {
          type: success ? 'info' : 'error',
          title: 'Scanner Padrão',
          message: success 
            ? `${scanner.name} definido como scanner padrão`
            : 'Erro ao definir scanner padrão'
        });
        
      } else if (result.response === 1) {
        // Testar scanner
        const scanner = scanners[0];
        const isWorking = await this.testScanner(scanner.id);
        
        dialog.showMessageBox(parentWindow, {
          type: isWorking ? 'info' : 'error',
          title: 'Teste de Scanner',
          message: isWorking
            ? `${scanner.name} está funcionando corretamente`
            : `Erro ao conectar com ${scanner.name}`
        });
      }
      
    } catch (error) {
      console.error('Erro no diálogo de scanner:', error);
      dialog.showMessageBox(parentWindow, {
        type: 'error',
        title: 'Erro',
        message: 'Erro ao abrir configurações de scanner'
      });
    }
  }
}