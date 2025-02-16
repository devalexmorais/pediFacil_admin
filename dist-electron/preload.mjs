"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Comunicação IPC
  send: (channel, data) => {
    const validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Você pode expor outras APIs necessárias aqui
  invoke: (channel, data) => {
    const validChannels = ["invoke-action"];
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, data);
    }
  }
});
console.log("Preload script carregado com sucesso!");
