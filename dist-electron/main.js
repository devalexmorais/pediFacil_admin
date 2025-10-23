import { app, BrowserWindow, protocol } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : path.join(process.env.APP_ROOT, "dist");
let win = null;
function createWindow() {
  const iconPath = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public", "logo.png") : path.join(process.env.APP_ROOT, "dist", "logo.png");
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    autoHideMenuBar: true,
    show: false,
    // Não mostra a janela até carregar completamente
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      webSecurity: false,
      // Permite carregamento de recursos locais
      devTools: true,
      spellcheck: false,
      // Desabilita correção ortográfica
      backgroundThrottling: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      sandbox: false
    }
  });
  win.once("ready-to-show", () => {
    if (win) {
      win.show();
    }
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Falha ao carregar a página:", errorCode, errorDescription);
    setTimeout(() => {
      if (win) {
        if (VITE_DEV_SERVER_URL) {
          win.loadURL(VITE_DEV_SERVER_URL);
        } else {
          const indexPath = path.join(RENDERER_DIST, "index.html");
          console.log("Tentando carregar arquivo:", indexPath);
          win.loadFile(indexPath);
        }
      }
    }, 3e3);
  });
  win.webContents.on("did-finish-load", () => {
    console.log("Página carregada com sucesso");
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.on("unresponsive", () => {
    console.warn("WebContents não responsivo");
  });
  win.webContents.on("responsive", () => {
    console.log("WebContents responsivo novamente");
  });
  win.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) {
      console.error("[Renderer Error]:", message);
    }
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Processo de renderização falhou:", details);
  });
  win.webContents.on("did-finish-load", () => {
    console.log("Aplicação carregada com sucesso");
  });
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  }
  if (!VITE_DEV_SERVER_URL) {
    console.log("Aplicação em modo produção");
  }
  if (VITE_DEV_SERVER_URL) {
    console.log("Carregando do servidor de desenvolvimento:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(RENDERER_DIST, "index.html");
    console.log("Carregando arquivo local:", indexPath);
    try {
      const fs = require("fs");
      if (fs.existsSync(indexPath)) {
        const appUrl = "app://index.html";
        win.loadURL(appUrl);
      } else {
        console.error("❌ Arquivo index.html não encontrado, usando método tradicional");
        win.loadFile(indexPath);
      }
    } catch (error) {
      console.error("Erro ao carregar aplicação:", error);
      win.loadFile(indexPath);
    }
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Erro não tratado:", error);
});
app.whenReady().then(async () => {
  if (!VITE_DEV_SERVER_URL) {
    protocol.handle("app", async (request) => {
      const filePath = request.url.slice("app://".length);
      const fullPath = path.join(RENDERER_DIST, filePath);
      if (VITE_DEV_SERVER_URL) {
        console.log("Servindo arquivo via protocolo app://", filePath);
      }
      try {
        const data = await readFile(fullPath);
        const ext = path.extname(fullPath);
        let mimeType = "text/plain";
        switch (ext) {
          case ".html":
            mimeType = "text/html";
            break;
          case ".js":
            mimeType = "application/javascript";
            break;
          case ".css":
            mimeType = "text/css";
            break;
          case ".png":
            mimeType = "image/png";
            break;
          case ".jpg":
          case ".jpeg":
            mimeType = "image/jpeg";
            break;
          case ".svg":
            mimeType = "image/svg+xml";
            break;
          case ".ico":
            mimeType = "image/x-icon";
            break;
        }
        return new Response(data, {
          headers: {
            "Content-Type": mimeType,
            "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:;"
          }
        });
      } catch (error) {
        console.error("Erro ao servir arquivo:", fullPath, error);
        return new Response("File not found", { status: 404 });
      }
    });
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
