import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isDev } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 1000,
    minHeight: 700,
    title: 'BaatCheet - UmrooProductions',
    icon: join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#1e1f22',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Register default global shortcuts
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    mainWindow?.webContents.send('shortcut:triggered', 'toggle-mute');
  });
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    mainWindow?.webContents.send('shortcut:triggered', 'toggle-deafen');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('shortcuts:register', (_event, shortcuts: { mute: string; deafen: string }) => {
  globalShortcut.unregisterAll();
  if (shortcuts.mute) {
    globalShortcut.register(shortcuts.mute, () => {
      mainWindow?.webContents.send('shortcut:triggered', 'toggle-mute');
    });
  }
  if (shortcuts.deafen) {
    globalShortcut.register(shortcuts.deafen, () => {
      mainWindow?.webContents.send('shortcut:triggered', 'toggle-deafen');
    });
  }
  return true;
});

export {};