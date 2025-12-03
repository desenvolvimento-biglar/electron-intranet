import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AppConfig {
  webUrl: string;
  apiPort: number;
  allowedOrigins: string[];
  autoStart: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  deviceSettings: {
    enablePrinter: boolean;
    enableCamera: boolean;
    enableUSB: boolean;
    enableSerial: boolean;
  };
}

/**
 * Gerenciador de configurações da aplicação
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private configPath: string;

  private constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadDefaultConfig();
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Obtém configuração atual
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração
   */
  public updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * Obtém valor específico da configuração
   */
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Define valor específico da configuração
   */
  public set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Recarrega configuração do arquivo
   */
  public reload(): void {
    this.loadConfig();
  }

  /**
   * Restaura configurações padrão
   */
  public resetToDefault(): void {
    this.config = this.loadDefaultConfig();
    this.saveConfig();
  }

  /**
   * Carrega configuração padrão
   */
  private loadDefaultConfig(): AppConfig {
    return {
      webUrl: process.env.WEB_URL || 'http://localhost:3000',
      apiPort: parseInt(process.env.API_PORT || '8080'),
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000'
      ],
      autoStart: true,
      logLevel: 'info',
      deviceSettings: {
        enablePrinter: true,
        enableCamera: true,
        enableUSB: true,
        enableSerial: true
      }
    };
  }

  /**
   * Obtém caminho do arquivo de configuração
   */
  private getConfigPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config.json');
  }

  /**
   * Carrega configuração do arquivo
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        
        // Mesclar com configuração padrão para garantir todas as propriedades
        this.config = { ...this.loadDefaultConfig(), ...loadedConfig };
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      // Manter configuração padrão em caso de erro
    }
  }

  /**
   * Salva configuração no arquivo
   */
  private saveConfig(): void {
    try {
      // Criar diretório se não existir
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Salvar configuração
      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  }

  /**
   * Valida configuração
   */
  public validateConfig(): boolean {
    try {
      // Validar URL
      new URL(this.config.webUrl);

      // Validar porta
      if (this.config.apiPort < 1 || this.config.apiPort > 65535) {
        return false;
      }

      // Validar origens permitidas
      for (const origin of this.config.allowedOrigins) {
        new URL(origin);
      }

      return true;
    } catch (error) {
      console.error('Configuração inválida:', error);
      return false;
    }
  }

  /**
   * Exporta configuração para backup
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa configuração de backup
   */
  public importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson) as AppConfig;
      
      // Validar estrutura básica
      if (typeof importedConfig.webUrl !== 'string' ||
          typeof importedConfig.apiPort !== 'number') {
        return false;
      }

      this.config = { ...this.loadDefaultConfig(), ...importedConfig };
      
      if (this.validateConfig()) {
        this.saveConfig();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao importar configuração:', error);
      return false;
    }
  }
}