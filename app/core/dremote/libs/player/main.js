const electron = require('electron');
const path = require('path');
const url = require('url');
const ipc = require('node-ipc');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const {
  app,
  BrowserWindow
} = electron;

// simple parameters initialization
const electronConfig = {
  URL_LAUNCHER_TOUCH: process.env.URL_LAUNCHER_TOUCH === '1' ? 1 : 0,
  URL_LAUNCHER_TOUCH_SIMULATE: process.env.URL_LAUNCHER_TOUCH_SIMULATE === '1' ? 1 : 0,
  URL_LAUNCHER_FRAME: process.env.URL_LAUNCHER_FRAME === '1' ? 1 : 0,
  URL_LAUNCHER_KIOSK: process.env.URL_LAUNCHER_KIOSK === '1' ? 1 : 0,
  URL_LAUNCHER_NODE: process.env.URL_LAUNCHER_NODE === '1' ? 1 : 0,
  URL_LAUNCHER_WIDTH: parseInt(process.env.URL_LAUNCHER_WIDTH || 1920, 10),
  URL_LAUNCHER_HEIGHT: parseInt(process.env.URL_LAUNCHER_HEIGHT || 1080, 10),
  URL_LAUNCHER_TITLE: process.env.URL_LAUNCHER_TITLE || 'RESIN.IO',
  URL_LAUNCHER_CONSOLE: process.env.URL_LAUNCHER_CONSOLE === '1' ? 1 : 0,
  URL_LAUNCHER_URL: process.env.URL_LAUNCHER_URL || `file:///${path.join(__dirname, 'data', 'index.html')}`,
  URL_LAUNCHER_ZOOM: parseFloat(process.env.URL_LAUNCHER_ZOOM || 1.0),
  URL_LAUNCHER_OVERLAY_SCROLLBARS: process.env.URL_LAUNCHER_CONSOLE === '1' ? 1 : 0,
};
app.disableHardwareAcceleration();
// enable touch events if your device supports them
if (electronConfig.URL_LAUNCHER_TOUCH) {
  app.commandLine.appendSwitch('--touch-devices');
}
// simulate touch events - might be useful for touchscreen with partial driver support
if (electronConfig.URL_LAUNCHER_TOUCH_SIMULATE) {
  app.commandLine.appendSwitch('--simulate-touch-screen-with-mouse');
}

if (process.env.NODE_ENV === 'development') {
  console.log('Running in development mode');
  Object.assign(electronConfig, {
    URL_LAUNCHER_HEIGHT: 600,
    URL_LAUNCHER_WIDTH: 800,
    URL_LAUNCHER_KIOSK: 0,
    URL_LAUNCHER_CONSOLE: 1,
    URL_LAUNCHER_FRAME: 1,
  });
}

/*
 we initialize our application display as a callback of the electronJS "ready" event
 */
app.on('ready', () => {
  'use strict';
  // here we actually configure the behavour of electronJS
  const window = new BrowserWindow({
    width: electronConfig.URL_LAUNCHER_WIDTH,
    height: electronConfig.URL_LAUNCHER_HEIGHT,
    frame: !!(electronConfig.URL_LAUNCHER_FRAME),
    title: electronConfig.URL_LAUNCHER_TITLE,
    kiosk: !!(electronConfig.URL_LAUNCHER_KIOSK),
    webPreferences: {
      sandbox: false,
      nodeIntegration: !!(electronConfig.URL_LAUNCHER_NODE),
      zoomFactor: electronConfig.URL_LAUNCHER_ZOOM,
      overlayScrollbars: !!(electronConfig.URL_LAUNCHER_OVERLAY_SCROLLBARS),
    },
  });

  window.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      window.show();
    }, 300);
  });

  // if the env-var is set to true,
  // a portion of the screen will be dedicated to the chrome-dev-tools
  if (electronConfig.URL_LAUNCHER_CONSOLE) {
    window.webContents.openDevTools();
  }
  process.on('uncaughtException', function (err) {
    console.log(err);
  });
  // the big red button, here we go
  window.loadURL(electronConfig.URL_LAUNCHER_URL);

  // recieve URI to display
  ipc.config.id = 'dplayeripc';
  ipc.config.retry = 1500;
  ipc.serve(
    function () {
      ipc.server.on(
        'message',
        function (data, socket) {
          //ipc.log('got a message : '.debug, data);
          //console.log(data);
          window.loadURL(data); // display recieved URI
          //ipc.server.emit(
          //  socket,
          //  'message', //this can be anything you want so long as
          //  //your client knows.
          //  data + ' world!'
          //);
        }
      );
      ipc.server.on(
        'socket.disconnected',
        function (socket, destroyedSocketID) {
          //ipc.log('client ' + destroyedSocketID + ' has disconnected!');
        }
      );
    }
  );
  //ipc.serve(() => ipc.server.on('set-uri', message => {
  //  console.log(message);
  //  window.loadURL(message); // display recieved URI
  //}));
  ipc.server.start();
});