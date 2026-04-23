const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: true, // 🔥 TOUJOURS désactivé
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('login.html');

  // 🔥 bloque ouverture DevTools
  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });

  // 🔥 bloque raccourcis clavier
  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && ['i', 'j', 'c'].includes(input.key.toLowerCase()))
    ) {
      event.preventDefault();
    }
  });

  // 🔥 bloque clic droit
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});