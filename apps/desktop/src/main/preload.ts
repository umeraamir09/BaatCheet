import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const validChannels = ['message:receive', 'auth:stateChanged', 'auth:callback', 'shortcut:triggered'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => listener(...args));
    }
  },
  
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    const validChannels = ['message:receive', 'auth:stateChanged', 'auth:callback', 'shortcut:triggered'];
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, listener);
    }
  },
  
  send: (channel: string, ...args: unknown[]) => {
    const validChannels = ['message:send'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  invoke: (channel: string, ...args: unknown[]) => {
    const validChannels = ['shortcuts:register', 'auth:openExternal'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.resolve();
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;