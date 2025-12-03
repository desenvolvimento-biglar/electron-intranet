import { contextBridge, ipcRenderer } from 'electron';

// Exposição segura das APIs para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // APIs de dispositivos
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printDocument: (printData: any) => ipcRenderer.invoke('print-document', printData),
  
  capturePhoto: () => ipcRenderer.invoke('capture-photo'),
  getCameras: () => ipcRenderer.invoke('get-cameras'),
  
  getUSBDevices: () => ipcRenderer.invoke('get-usb-devices'),
  
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  serialWrite: (port: string, data: string) => ipcRenderer.invoke('serial-write', port, data),
  
  // APIs de diálogo
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Eventos
  onDeviceConnected: (callback: (device: any) => void) => {
    ipcRenderer.on('device-connected', (event, device) => callback(device));
  },
  
  onDeviceDisconnected: (callback: (device: any) => void) => {
    ipcRenderer.on('device-disconnected', (event, device) => callback(device));
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Definição de tipos para TypeScript
declare global {
  interface Window {
    electronAPI: {
      getPrinters: () => Promise<any[]>;
      printDocument: (printData: any) => Promise<boolean>;
      capturePhoto: () => Promise<string>;
      getCameras: () => Promise<any[]>;
      getUSBDevices: () => Promise<any[]>;
      getSerialPorts: () => Promise<any[]>;
      serialWrite: (port: string, data: string) => Promise<boolean>;
      showMessageBox: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      onDeviceConnected: (callback: (device: any) => void) => void;
      onDeviceDisconnected: (callback: (device: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}