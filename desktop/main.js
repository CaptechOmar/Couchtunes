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
// Linux: run natively on Wayland when the desktop uses it (sharp picture and the right cursor size on scaled screens, which XWayland gets wrong).
// Chromium picks its display backend before any script runs, so the flag has to be on the command line: start again once with it.
// Set COUCHTUNES_X11=1 to use X11 / XWayland instead.
if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland' && !process.env.COUCHTUNES_X11
    && !process.argv.some(a => a.startsWith('--ozone-platform'))) {
  app.relaunch({ execPath: process.env.APPIMAGE || process.execPath, args: process.argv.slice(1).concat('--ozone-platform-hint=auto') });
  app.exit(0);
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
    width: 1280, height: 720, fullscreen: true, minWidth: 640, minHeight: 400, backgroundColor: '#111111', title: 'Couchtunes',
    autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'),
    webPreferences: { backgroundThrottling: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  if (process.env.COUCHTUNES_DEBUG) {   // prints the window and screen sizes, to help find fullscreen problems
    for (const t of [500, 1500, 3000, 6000]) setTimeout(async () => {
      const d = require('electron').screen.getPrimaryDisplay();
      const r = await win.webContents.executeJavaScript('JSON.stringify({innerW:innerWidth,innerH:innerHeight,screenW:screen.width,screenH:screen.height,dpr:devicePixelRatio})').catch(e => String(e));
      console.log('[couchtunes] t=' + t, 'fullscreen=' + win.isFullScreen(), 'bounds=' + JSON.stringify(win.getBounds()), 'content=' + JSON.stringify(win.getContentBounds()),
        'display=' + JSON.stringify(d.bounds), 'scale=' + d.scaleFactor, r, 'platform=' + (process.env.XDG_SESSION_TYPE || '?'));
    }, t);
  }
  // ?tv turns on the 10-foot layout, focus navigation and game controller support
  win.loadFile(path.join(__dirname, 'app', 'index.html'), { query: { tv: '1' } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // Right-click menu for the text fields (sign-in, search): Copy and Paste. The fields are read-only in this layout, so Paste goes through the page.
  win.webContents.on('context-menu', (e, params) => {
    const field = params.inputFieldType && params.inputFieldType !== 'none';
    if (!field && !params.selectionText) return;
    const items = [];
    if (params.selectionText) items.push({ label: 'Copy', role: 'copy' });
    if (field) items.push({ label: 'Paste', click: () => win.webContents.executeJavaScript("typeof pasteInto==='function'&&pasteInto(oskTarget())").catch(() => {}) });
    Menu.buildFromTemplate(items).popup({ window: win });
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
