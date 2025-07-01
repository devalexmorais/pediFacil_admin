import { app as d, BrowserWindow as g, protocol as v } from "electron";
import n from "node:path";
import { fileURLToPath as f } from "node:url";
import { readFile as h } from "node:fs/promises";
const p = n.dirname(f(import.meta.url));
process.env.APP_ROOT = n.join(p, "..");
const a = process.env.VITE_DEV_SERVER_URL, C = n.join(process.env.APP_ROOT, "dist-electron"), c = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = a ? n.join(process.env.APP_ROOT, "public") : n.join(process.env.APP_ROOT, "dist");
let e = null;
function u() {
  const l = a ? n.join(process.env.APP_ROOT, "public", "logo.png") : n.join(process.env.APP_ROOT, "dist", "logo.png");
  if (e = new g({
    width: 1200,
    height: 800,
    icon: l,
    autoHideMenuBar: !0,
    show: !1,
    // Não mostra a janela até carregar completamente
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      preload: n.join(p, "preload.cjs"),
      webSecurity: !1,
      // Permite carregamento de recursos locais
      devTools: !0,
      spellcheck: !1,
      // Desabilita correção ortográfica
      backgroundThrottling: !1,
      allowRunningInsecureContent: !0,
      experimentalFeatures: !0,
      sandbox: !1
    }
  }), e.once("ready-to-show", () => {
    e && e.show();
  }), e.webContents.on("did-fail-load", (s, o, t) => {
    console.error("Falha ao carregar a página:", o, t), setTimeout(() => {
      if (e)
        if (a)
          e.loadURL(a);
        else {
          const i = n.join(c, "index.html");
          console.log("Tentando carregar arquivo:", i), e.loadFile(i);
        }
    }, 3e3);
  }), e.webContents.on("did-finish-load", () => {
    console.log("Página carregada com sucesso"), e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("unresponsive", () => {
    console.warn("WebContents não responsivo");
  }), e.webContents.on("responsive", () => {
    console.log("WebContents responsivo novamente");
  }), e.webContents.setWindowOpenHandler(() => ({ action: "deny" })), e.webContents.on("console-message", (s, o, t, i, r) => {
    const m = ["verbose", "info", "warning", "error"][o] || "unknown";
    console.log(`[Renderer ${m.toUpperCase()}]:`, t), r && console.log(`  Source: ${r}:${i}`);
  }), e.webContents.on("render-process-gone", (s, o) => {
    console.error("Processo de renderização falhou:", o);
  }), e.webContents.on("dom-ready", () => {
    console.log("DOM pronto!");
  }), e.webContents.on("did-start-loading", () => {
    console.log("Iniciando carregamento...");
  }), e.webContents.on("did-stop-loading", () => {
    console.log("Carregamento finalizado");
  }), e.webContents.openDevTools(), e.webContents.once("dom-ready", () => {
    e == null || e.webContents.openDevTools();
  }), console.log("=== DEBUG PATHS ==="), console.log("VITE_DEV_SERVER_URL:", a), console.log("RENDERER_DIST:", c), console.log("APP_ROOT:", process.env.APP_ROOT), console.log("Icon path:", l), console.log("__dirname:", p), console.log("Process CWD:", process.cwd()), a)
    console.log("Carregando do servidor de desenvolvimento:", a), e.loadURL(a);
  else {
    const s = n.join(c, "index.html");
    console.log("Carregando arquivo local:", s);
    try {
      const o = require("fs");
      if (o.existsSync(s)) {
        console.log("✅ Arquivo index.html encontrado"), console.log("Conteúdo da pasta dist:", o.readdirSync(c));
        const t = "app://index.html";
        console.log("Carregando via protocolo customizado:", t), e.loadURL(t);
      } else
        console.error("❌ Arquivo index.html NÃO encontrado em:", s), console.log("Conteúdo do diretório pai:", o.readdirSync(n.dirname(s))), e.loadFile(s);
    } catch (o) {
      console.error("Erro ao verificar arquivos:", o), e.loadFile(s);
    }
  }
}
d.on("window-all-closed", () => {
  process.platform !== "darwin" && (d.quit(), e = null);
});
d.on("activate", () => {
  g.getAllWindows().length === 0 && u();
});
process.on("uncaughtException", (l) => {
  console.error("Erro não tratado:", l);
});
d.whenReady().then(async () => {
  a || v.handle("app", async (l) => {
    const s = l.url.slice(6), o = n.join(c, s);
    console.log("Servindo arquivo via protocolo app://", s, "em", o);
    try {
      const t = await h(o), i = n.extname(o);
      let r = "text/plain";
      switch (i) {
        case ".html":
          r = "text/html";
          break;
        case ".js":
          r = "application/javascript";
          break;
        case ".css":
          r = "text/css";
          break;
        case ".png":
          r = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          r = "image/jpeg";
          break;
        case ".svg":
          r = "image/svg+xml";
          break;
        case ".ico":
          r = "image/x-icon";
          break;
      }
      return new Response(t, {
        headers: {
          "Content-Type": r,
          "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:;"
        }
      });
    } catch (t) {
      return console.error("Erro ao servir arquivo:", o, t), new Response("File not found", { status: 404 });
    }
  }), u();
});
export {
  C as MAIN_DIST,
  c as RENDERER_DIST,
  a as VITE_DEV_SERVER_URL
};
