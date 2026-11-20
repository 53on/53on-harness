'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const ask = function (op) { return function (a) { ipcRenderer.send('tab:do', op, a == null ? '' : String(a)); }; };
contextBridge.exposeInMainWorld('ShareBridgeDesktop', { closeTab: ask('close'), requestChatAndClose: ask('chat'), requestMessengerAndClose: ask('msgs'),
  requestUrlAndClose: ask('url'), openExternal: ask('out'), setSecure: ask('secure'), shareText: ask('share') });
