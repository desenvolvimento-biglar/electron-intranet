/**
 * Serviço base para gerenciamento de dispositivos
 * Fornece funcionalidades comuns para todos os serviços de dispositivos
 */
export abstract class DeviceService {
  protected isInitialized: boolean = false;
  protected eventListeners: Map<string, Function[]> = new Map();

  /**
   * Inicializa o serviço
   */
  abstract initialize(): Promise<void>;

  /**
   * Finaliza o serviço e limpa recursos
   */
  abstract cleanup(): Promise<void>;

  /**
   * Adiciona um listener para eventos
   */
  protected addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove um listener de eventos
   */
  protected removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emite um evento para todos os listeners
   */
  protected emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro ao executar listener do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Verifica se um dispositivo está disponível
   */
  abstract isDeviceAvailable(deviceId: string): Promise<boolean>;

  /**
   * Lista todos os dispositivos disponíveis
   */
  abstract getAvailableDevices(): Promise<any[]>;

  /**
   * Obtém informações de um dispositivo específico
   */
  abstract getDeviceInfo(deviceId: string): Promise<any>;

  /**
   * Testa a conectividade com um dispositivo
   */
  abstract testDevice(deviceId: string): Promise<boolean>;
}