const { app, BrowserWindow, Menu, session, globalShortcut } = require('electron');
const path = require('path');

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
    autoHideMenuBar: true, icon: path.join(__dirname, process.platform === 'win32' ? 'icon-win.png' : 'icon.png'),
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
