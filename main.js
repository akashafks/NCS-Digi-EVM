const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(`file://${path.join(__dirname, 'Digital EVM 1', 'dist', 'index.html').replace(/\\/g, '/')}`);
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Settings storage (admin password and hotkey) - module scope so IPC can access
const appDir = process.cwd();
const SETTINGS_DIR = path.join(appDir, 'data');
ensureDirSync(SETTINGS_DIR);
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');
// Two-tier password model:
// - Primary password is fixed as 'admin' (hardcoded, never stored, never changeable)
// - Secondary password (optional) is stored in settings as 'secondaryPassword'
const defaultSettings = { secondaryPasswordHash: '', hotkey: 'Alt+H' };
const PRIMARY_PASSWORD = 'admin$EVMNCS';
const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      // Migration: if older builds stored adminPassword or secondaryPassword (plain), convert to hash
      if (data && typeof data.adminPassword === 'string' && !data.secondaryPasswordHash) {
        data.secondaryPasswordHash = sha256(String(data.adminPassword));
        delete data.adminPassword;
      }
      if (data && typeof data.secondaryPassword === 'string' && !data.secondaryPasswordHash) {
        data.secondaryPasswordHash = sha256(String(data.secondaryPassword));
        delete data.secondaryPassword;
      }
      return { ...defaultSettings, ...data };
    }
  } catch (_) {}
  return { ...defaultSettings };
}
function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

let currentSettings = loadSettings();

// Hotkey registration (dynamic) - module scope for reuse in IPC
function registerHotkey(hotkey) {
  try {
    globalShortcut.unregisterAll();
    const ok = globalShortcut.register(hotkey, () => {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send('next-voter');
      }
    });
    if (!ok) {
      // fallback to default
      if (hotkey !== defaultSettings.hotkey) {
        registerHotkey(defaultSettings.hotkey);
      }
    }
  } catch (_) {
    // ignore
  }
}

app.whenReady().then(() => {
  // Use app directory for portable data storage
  const DATA_DIR = path.join(appDir, 'data', 'booths');
  ensureDirSync(DATA_DIR);

  const getBoothPath = (boothName) => path.join(DATA_DIR, boothName);
  const getBoothJson = (boothName) => path.join(getBoothPath(boothName), 'booth.json');
  const getRolePath = (boothName, roleName) => path.join(getBoothPath(boothName), 'roles', roleName);
  const getCandidatePhotoPath = (boothName, roleName, candidateName) => path.join(getRolePath(boothName, roleName), 'photos', `${candidateName}.jpg`);
  const getVotesPath = (boothName) => path.join(getBoothPath(boothName), 'votes.json');

  ipcMain.handle('save-booth', async (event, boothName, data) => {
    const dir = getBoothPath(boothName);
    ensureDirSync(dir);
    fs.writeFileSync(getBoothJson(boothName), JSON.stringify(data, null, 2));
    return true;
  });
  ipcMain.handle('load-booths', async () => {
    ensureDirSync(DATA_DIR);
    const booths = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());
    return booths.map(boothName => {
      const file = getBoothJson(boothName);
      if (fs.existsSync(file)) {
        return { boothName, ...JSON.parse(fs.readFileSync(file, 'utf-8')) };
      }
      return null;
    }).filter(Boolean);
  });
  ipcMain.handle('save-candidate', async (event, boothName, roleName, candidateName, data) => {
    const dir = getRolePath(boothName, roleName);
    ensureDirSync(dir);
    const file = path.join(dir, `${candidateName}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  });
  ipcMain.handle('load-candidates', async (event, boothName, roleName) => {
    const dir = getRolePath(boothName, roleName);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const file = path.join(dir, f);
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      });
  });
  ipcMain.handle('save-votes', async (event, boothName, data) => {
    const dir = getBoothPath(boothName);
    ensureDirSync(dir);
    fs.writeFileSync(getVotesPath(boothName), JSON.stringify(data, null, 2));
    return true;
  });
  ipcMain.handle('load-votes', async (event, boothName) => {
    const file = getVotesPath(boothName);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  });
  ipcMain.handle('save-photo', async (event, boothName, roleName, candidateName, photoBuffer) => {
    const dir = path.join(getRolePath(boothName, roleName), 'photos');
    ensureDirSync(dir);
    const file = getCandidatePhotoPath(boothName, roleName, candidateName);
    fs.writeFileSync(file, Buffer.from(photoBuffer));
    return true;
  });
  ipcMain.handle('load-photo', async (event, boothName, roleName, candidateName) => {
    const file = getCandidatePhotoPath(boothName, roleName, candidateName);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file).toString('base64');
  });
  ipcMain.handle('delete-booth-files', async (event, boothName) => {
    const dir = path.join(process.cwd(), 'data', 'booths', boothName);
    const boothJson = path.join(dir, 'booth.json');
    const votesJson = path.join(dir, 'votes.json');
    try {
      if (fs.existsSync(boothJson)) fs.unlinkSync(boothJson);
      if (fs.existsSync(votesJson)) fs.unlinkSync(votesJson);
      // Optionally, remove the booth directory if empty
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      return true;
    } catch (err) {
      return false;
    }
  });

  createWindow();

  app.whenReady().then(() => {
    registerHotkey(currentSettings.hotkey || defaultSettings.hotkey);
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// IPC for settings
// Centralized password validation
function validatePasswordAny(input) {
  if (typeof input !== 'string') return false;
  if (input === PRIMARY_PASSWORD) return true; // Primary is fixed and always valid
  const hasSecondary = typeof currentSettings.secondaryPasswordHash === 'string' && currentSettings.secondaryPasswordHash.length > 0;
  if (!hasSecondary) return false;
  return sha256(input) === currentSettings.secondaryPasswordHash;
}

function validateAdminOnly(input) {
  return typeof input === 'string' && input === PRIMARY_PASSWORD;
}

ipcMain.handle('get-settings', async () => {
  // Do not expose password hashes. Only expose safe metadata.
  return { hotkey: currentSettings.hotkey || defaultSettings.hotkey, hasSecondary: !!(currentSettings.secondaryPasswordHash) };
});
ipcMain.handle('set-settings', async (event, updates) => {
  const sanitized = { ...updates } || {};
  // Only allow hotkey via this endpoint (passwords use dedicated endpoint below)
  const next = { ...currentSettings };
  if (typeof sanitized.hotkey === 'string' && sanitized.hotkey.trim().length > 0) {
    next.hotkey = sanitized.hotkey.trim();
    registerHotkey(next.hotkey);
  }
  currentSettings = next;
  saveSettings(currentSettings);
  return { hotkey: currentSettings.hotkey, hasSecondary: !!currentSettings.secondaryPasswordHash };
});

// Validate input against admin or secondary (if set)
ipcMain.handle('validate-password', async (event, input) => {
  return { ok: validatePasswordAny(input) };
});

// Validate input against admin only
ipcMain.handle('validate-admin', async (event, input) => {
  return { ok: validateAdminOnly(input) };
});

// Update secondary password immediately (invalidate old). currentInput must be admin or current secondary
ipcMain.handle('set-secondary-password', async (event, { currentInput, newPassword }) => {
  if (!validatePasswordAny(currentInput)) {
    return { ok: false, error: 'Current password incorrect' };
  }
  if (typeof newPassword !== 'string' || newPassword.length === 0) {
    return { ok: false, error: 'Invalid new password' };
  }
  currentSettings.secondaryPasswordHash = sha256(newPassword);
  saveSettings(currentSettings);
  return { ok: true };
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 