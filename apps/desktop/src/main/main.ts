import { app, BrowserWindow, protocol, net, ipcMain, screen, globalShortcut, shell } from 'electron';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { isDev } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTOCOL_SCHEME = 'baatcheet';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: true,
    },
  },
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      secure: true,
      standard: true,
      corsEnabled: true,
    },
  },
]);

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(
    PROTOCOL_SCHEME,
    process.execPath,
    [resolve(process.argv[1])],
  );
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

let mainWindow: BrowserWindow | null = null;
let pendingAuthUrl: string | null = null;

const startupArg = process.argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
if (startupArg) {
  pendingAuthUrl = startupArg;
}

function handleAuthDeepLink(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== `${PROTOCOL_SCHEME}:` || parsed.host !== 'auth') return;
  const searchParams = parsed.searchParams;
  const payload: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    payload[key] = value;
  });
  console.log(`[auth] received deep link: ${url}`);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('auth:callback', payload);
  } else {
    pendingAuthUrl = url;
  }
}

function flushPendingAuthUrl() {
  if (pendingAuthUrl && mainWindow) {
    handleAuthDeepLink(pendingAuthUrl);
    pendingAuthUrl = null;
  }
}

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
      sandbox: false,
    },
    show: false,
    backgroundColor: '#1e1f22',
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isLocalUrl = details.url.startsWith('http://localhost:') || details.url.startsWith('app://');
    if (!isLocalUrl) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    const csp = isDev
      ? [
          "default-src 'self' http://localhost:5173 ws://localhost:5173; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "worker-src blob:; " +
          "frame-src 'self' https://discord.com https://*.discord.com; " +
          "connect-src 'self' http://localhost:3001 ws://localhost:3001 https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://signal.baatcheet.umroo.dev wss://signal.baatcheet.umroo.dev https://discord.com https://*.discord.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://cdn.discordapp.com https://*.discord.com;",
        ]
      : [
          "default-src 'self' app://localhost; " +
          "script-src 'self' 'unsafe-inline'; " +
          "worker-src blob:; " +
          "frame-src 'self' https://discord.com https://*.discord.com; " +
          "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://signal.baatcheet.umroo.dev wss://signal.baatcheet.umroo.dev https://discord.com https://*.discord.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://cdn.discordapp.com https://*.discord.com;",
        ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': csp,
      },
    });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('app://localhost/index.html');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = join(__dirname, '../dist', url.pathname);

    if (!existsSync(filePath) || url.pathname === '/') {
      filePath = join(__dirname, '../dist', 'index.html');
    }

    return net.fetch(`file://${filePath}`);
  });

  createWindow();
  flushPendingAuthUrl();

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

app.on('second-instance', (_event, commandLine) => {
  const deepLink = commandLine.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
  if (deepLink) {
    handleAuthDeepLink(deepLink);
  } else if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('open-url', (_event, url) => {
  handleAuthDeepLink(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

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

ipcMain.handle('auth:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
});

export {};
