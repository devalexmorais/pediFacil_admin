import { app, BrowserWindow, protocol } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

// Obtém o diretório atual
const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

// URLs e caminhos
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

// Corrige o caminho do VITE_PUBLIC para produção
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? 
  path.join(process.env.APP_ROOT, 'public') : 
  path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null

function createWindow() {
  // Define o caminho do ícone corretamente para produção e desenvolvimento
  const iconPath = VITE_DEV_SERVER_URL ? 
    path.join(process.env.APP_ROOT, 'public', 'logo.png') :
    path.join(process.env.APP_ROOT, 'dist', 'logo.png')

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    autoHideMenuBar: true,
    show: false, // Não mostra a janela até carregar completamente
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, // Permite carregamento de recursos locais
      devTools: true,
      spellcheck: false, // Desabilita correção ortográfica
      backgroundThrottling: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      sandbox: false
    }
  })

  // Mostra a janela apenas quando estiver pronta
  win.once('ready-to-show', () => {
    if (win) {
      win.show()
    }
  })

  // Adiciona handler de erro para carregamento
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Falha ao carregar a página:', errorCode, errorDescription)
    // Tenta recarregar após 3 segundos em caso de erro
    setTimeout(() => {
      if (win) {
        if (VITE_DEV_SERVER_URL) {
          win.loadURL(VITE_DEV_SERVER_URL)
        } else {
          const indexPath = path.join(RENDERER_DIST, 'index.html')
          console.log('Tentando carregar arquivo:', indexPath)
          win.loadFile(indexPath)
        }
      }
    }, 3000)
  })

  win.webContents.on('did-finish-load', () => {
    console.log('Página carregada com sucesso')
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Trata erros não tratados do webContents
  win.webContents.on('unresponsive', () => {
    console.warn('WebContents não responsivo')
  })

  win.webContents.on('responsive', () => {
    console.log('WebContents responsivo novamente')
  })

  // Previne navegação externa
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // Captura apenas erros críticos do console
  win.webContents.on('console-message', (_event, level, message) => {
    // Só exibe erros críticos (level 3 = error)
    if (level >= 3) {
      console.error('[Renderer Error]:', message)
    }
  })

  // Captura erros JavaScript do renderer
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Processo de renderização falhou:', details)
  })

  // Logs essenciais apenas
  win.webContents.on('did-finish-load', () => {
    console.log('Aplicação carregada com sucesso')
  })

  // Abre as ferramentas de desenvolvimento apenas em modo de desenvolvimento
  // Comentado para não abrir o DevTools automaticamente
  // if (VITE_DEV_SERVER_URL) {
  //   win.webContents.openDevTools()
  // }

  // Logs essenciais para debug se necessário
  if (!VITE_DEV_SERVER_URL) {
    console.log('Aplicação em modo produção')
  }
  
  if (VITE_DEV_SERVER_URL) {
    console.log('Carregando do servidor de desenvolvimento:', VITE_DEV_SERVER_URL)
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    const indexPath = path.join(RENDERER_DIST, 'index.html')
    console.log('Carregando arquivo local:', indexPath)
    
    // Verifica se o arquivo index.html existe
    try {
      const fs = require('fs')
      if (fs.existsSync(indexPath)) {
        // Usa protocolo customizado para carregar arquivos
        const appUrl = 'app://index.html'
        win.loadURL(appUrl)
      } else {
        console.error('❌ Arquivo index.html não encontrado, usando método tradicional')
        win.loadFile(indexPath)
      }
    } catch (error) {
      console.error('Erro ao carregar aplicação:', error)
      win.loadFile(indexPath)
    }
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Adiciona handler de erro não tratado
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error)
})

// Registra protocolo customizado antes do app estar pronto
app.whenReady().then(async () => {
  // Registra protocolo para servir arquivos locais
  if (!VITE_DEV_SERVER_URL) {
    protocol.handle('app', async (request) => {
      const filePath = request.url.slice('app://'.length)
      const fullPath = path.join(RENDERER_DIST, filePath)
      
      // Log apenas em caso de desenvolvimento
      if (VITE_DEV_SERVER_URL) {
        console.log('Servindo arquivo via protocolo app://', filePath)
      }
      
      try {
        const data = await readFile(fullPath)
        const ext = path.extname(fullPath)
        
        let mimeType = 'text/plain'
        switch (ext) {
          case '.html': mimeType = 'text/html'; break
          case '.js': mimeType = 'application/javascript'; break
          case '.css': mimeType = 'text/css'; break
          case '.png': mimeType = 'image/png'; break
          case '.jpg': 
          case '.jpeg': mimeType = 'image/jpeg'; break
          case '.svg': mimeType = 'image/svg+xml'; break
          case '.ico': mimeType = 'image/x-icon'; break
        }
        
        return new Response(data, {
          headers: {
            'Content-Type': mimeType,
            'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:;"
          }
        })
      } catch (error) {
        console.error('Erro ao servir arquivo:', fullPath, error)
        return new Response('File not found', { status: 404 })
      }
    })
  }
  
  createWindow()
})

export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
}
