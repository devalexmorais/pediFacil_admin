const { contextBridge, ipcRenderer } = require('electron')

// Expõe APIs seguras para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  // Comunicação IPC
  send: (channel: string, data: any) => {
    // Lista de canais permitidos para envio
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: Function) => {
    // Lista de canais permitidos para recebimento
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    }
  },
  // Você pode expor outras APIs necessárias aqui
  invoke: (channel: string, data: any) => {
    const validChannels = ['invoke-action']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
  }
})

// Log para debug
console.log('Preload script carregado com sucesso!')
