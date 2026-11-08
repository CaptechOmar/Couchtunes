const { app, BrowserWindow, Menu, session, globalShortcut } = require('electron');
const path = require('path');

// Linux: use the desktop's mouse cursor theme and size. Through XWayland the app would otherwise fall back to a small default cursor.
if (process.platform === 'linux') {
  try {
    const { execFileSync } = require('child_process');
    const gs = k => execFileSync('gsettings', ['get', 'org.gnome.desktop.interface', k], { timeout: 800, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().replace(/^'|'$/g, '');
    if (!process.env.XCURSOR_THEME) { const t = gs('cursor-theme'); if (t) process.env.XCURSOR_THEME = t; }
    if (!process.env.XCURSOR_SIZE) { const z = parseInt(gs('cursor-size'), 10); if (z > 0) process.env.XCURSOR_SIZE = String(z); }
  } catch (e) {}   // no gsettings here (another desktop, or inside the Flatpak, where couchtunes.sh does this)
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'GamepadButtonAxisEvents');

function create() {
  // The music server lives on another address, so allow its answers to reach the page.
  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    const h = Object.assign({}, d.responseHeaders);
    for (const k of Object.keys(h)) if (/^access-control-/i.test(k)) delete h[k];
    h['Access-Control-Allow-Origin'] = ['*'];
    h['Access-Control-Allow-Headers'] = ['*'];
    h['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS'];
    cb({ responseHeaders: h });
  });
  const win = new BrowserWindow({
    width: 1280, height: 720, show: false, minWidth: 640, minHeight: 400, backgroundColor: '#111111', title: 'Couchtunes',
    autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'),
    webPreferences: { backgroundThrottling: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  // Go full screen once the window exists. Asking for it at creation left the picture short of the screen edges
  // under Wayland (the Flatpak build), so we also check the size afterwards and redo it if it came out wrong.
  win.once('ready-to-show', () => {
    win.show(); win.setFullScreen(true);
    setTimeout(async () => {
      try {
        const bad = await win.webContents.executeJavaScript('Math.abs(innerWidth - screen.width) > 2 || Math.abs(innerHeight - screen.height) > 2');
        if (bad && win.isFullScreen()) { win.setFullScreen(false); setTimeout(() => win.setFullScreen(true), 400); }
      } catch (e) {}
    }, 1200);
  });
  // ?tv turns on the 10-foot layout, focus navigation and game controller support
  win.loadFile(path.join(__dirname, 'app', 'index.html'), { query: { tv: '1' } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
