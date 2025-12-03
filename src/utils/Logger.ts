import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

/**
 * Sistema de logging para a aplicação
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logPath: string;

  private constructor() {
    this.logPath = this.getLogPath();
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Define o nível de log
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log de erro
   */
  public error(message: string, data?: any, source?: string): void {
    this.log('error', message, data, source);
  }

  /**
   * Log de aviso
   */
  public warn(message: string, data?: any, source?: string): void {
    this.log('warn', message, data, source);
  }

  /**
   * Log de informação
   */
  public info(message: string, data?: any, source?: string): void {
    this.log('info', message, data, source);
  }

  /**
   * Log de debug
   */
  public debug(message: string, data?: any, source?: string): void {
    this.log('debug', message, data, source);
  }

  /**
   * Método principal de log
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source
    };

    // Log no console
    this.logToConsole(entry);

    // Log no arquivo
    this.logToFile(entry);
  }

  /**
   * Verifica se deve fazer log baseado no nível
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Log no console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]${entry.source ? ` [${entry.source}]` : ''}`;
    
    switch (entry.level) {
      case 'error':
        console.error(prefix, entry.message, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'info':
        console.info(prefix, entry.message, entry.data || '');
        break;
      case 'debug':
        console.debug(prefix, entry.message, entry.data || '');
        break;
    }
  }

  /**
   * Log no arquivo
   */
  private logToFile(entry: LogEntry): void {
    try {
      const logLine = this.formatLogEntry(entry);
      const logFile = this.getCurrentLogFile();
      
      fs.appendFileSync(logFile, logLine + '\n', 'utf8');
      
      // Rotacionar logs se necessário
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Erro ao escrever log no arquivo:', error);
    }
  }

  /**
   * Formata entrada de log para arquivo
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      entry.timestamp,
      entry.level.toUpperCase().padEnd(5),
      entry.source ? `[${entry.source}]` : '',
      entry.message
    ].filter(Boolean);
    
    let line = parts.join(' ');
    
    if (entry.data !== undefined) {
      try {
        const dataStr = typeof entry.data === 'string' 
          ? entry.data 
          : JSON.stringify(entry.data);
        line += ` | ${dataStr}`;
      } catch (error) {
        line += ` | [Erro ao serializar dados]`;
      }
    }
    
    return line;
  }

  /**
   * Obtém caminho do diretório de logs
   */
  private getLogPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'logs');
  }

  /**
   * Garante que o diretório de logs existe
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error);
    }
  }

  /**
   * Obtém arquivo de log atual
   */
  private getCurrentLogFile(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logPath, `app-${date}.log`);
  }

  /**
   * Rotaciona logs antigos
   */
  private rotateLogsIfNeeded(): void {
    try {
      const files = fs.readdirSync(this.logPath)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logPath, file),
          stats: fs.statSync(path.join(this.logPath, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Manter apenas os últimos 30 dias de logs
      const maxLogFiles = 30;
      if (files.length > maxLogFiles) {
        const filesToDelete = files.slice(maxLogFiles);
        
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log(`Log antigo removido: ${file.name}`);
          } catch (error) {
            console.error(`Erro ao remover log ${file.name}:`, error);
          }
        });
      }

      // Verificar tamanho do arquivo atual
      const currentLogFile = this.getCurrentLogFile();
      if (fs.existsSync(currentLogFile)) {
        const stats = fs.statSync(currentLogFile);
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (stats.size > maxSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const archiveName = `app-${timestamp}.log`;
          const archivePath = path.join(this.logPath, archiveName);
          
          fs.renameSync(currentLogFile, archivePath);
          console.log(`Log arquivado: ${archiveName}`);
        }
      }
    } catch (error) {
      console.error('Erro na rotação de logs:', error);
    }
  }

  /**
   * Obtém logs recentes
   */
  public getRecentLogs(limit: number = 100): LogEntry[] {
    try {
      const currentLogFile = this.getCurrentLogFile();
      
      if (!fs.existsSync(currentLogFile)) {
        return [];
      }

      const content = fs.readFileSync(currentLogFile, 'utf8');
      const lines = content.split('\n')
        .filter(line => line.trim())
        .slice(-limit);

      return lines.map(line => this.parseLogLine(line))
        .filter(entry => entry !== null) as LogEntry[];
    } catch (error) {
      console.error('Erro ao obter logs recentes:', error);
      return [];
    }
  }

  /**
   * Faz parse de uma linha de log
   */
  private parseLogLine(line: string): LogEntry | null {
    try {
      // Formato: timestamp level [source] message | data
      const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\w+)\s*(\[.*?\])?\s*(.*?)(?:\s*\|\s*(.*))?$/;
      const match = line.match(regex);
      
      if (!match) {
        return null;
      }

      const [, timestamp, level, source, message, data] = match;
      
      const entry: LogEntry = {
        timestamp,
        level: level.toLowerCase() as LogLevel,
        message: message.trim(),
        source: source ? source.replace(/[\[\]]/g, '') : undefined
      };

      if (data) {
        try {
          entry.data = JSON.parse(data);
        } catch {
          entry.data = data;
        }
      }

      return entry;
    } catch (error) {
      return null;
    }
  }

  /**
   * Limpa todos os logs
   */
  public clearLogs(): void {
    try {
      const files = fs.readdirSync(this.logPath)
        .filter(file => file.endsWith('.log'));

      files.forEach(file => {
        fs.unlinkSync(path.join(this.logPath, file));
      });

      this.info('Logs limpos', undefined, 'Logger');
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
    }
  }

  /**
   * Exporta logs para arquivo
   */
  public exportLogs(exportPath: string): boolean {
    try {
      const logs = this.getRecentLogs(1000);
      const content = logs.map(entry => this.formatLogEntry(entry)).join('\n');
      
      fs.writeFileSync(exportPath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      return false;
    }
  }
}