import { app as c, BrowserWindow as p, protocol as f } from "electron";
import o from "node:path";
import { fileURLToPath as m } from "node:url";
import { readFile as h } from "node:fs/promises";
const u = o.dirname(m(import.meta.url));
process.env.APP_ROOT = o.join(u, "..");
const r = process.env.VITE_DEV_SERVER_URL, b = o.join(process.env.APP_ROOT, "dist-electron"), d = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = r ? o.join(process.env.APP_ROOT, "public") : o.join(process.env.APP_ROOT, "dist");
let e = null;
function g() {
  const i = r ? o.join(process.env.APP_ROOT, "public", "logo.png") : o.join(process.env.APP_ROOT, "dist", "logo.png");
  if (e = new p({
    width: 1200,
    height: 800,
    icon: i,
    autoHideMenuBar: !0,
    show: !1,
    // Não mostra a janela até carregar completamente
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      preload: o.join(u, "preload.cjs"),
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
  }), e.webContents.on("did-fail-load", (s, n, a) => {
    console.error("Falha ao carregar a página:", n, a), setTimeout(() => {
      if (e)
        if (r)
          e.loadURL(r);
        else {
          const l = o.join(d, "index.html");
          console.log("Tentando carregar arquivo:", l), e.loadFile(l);
        }
    }, 3e3);
  }), e.webContents.on("did-finish-load", () => {
    console.log("Página carregada com sucesso"), e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("unresponsive", () => {
    console.warn("WebContents não responsivo");
  }), e.webContents.on("responsive", () => {
    console.log("WebContents responsivo novamente");
  }), e.webContents.setWindowOpenHandler(() => ({ action: "deny" })), e.webContents.on("console-message", (s, n, a) => {
    n >= 3 && console.error("[Renderer Error]:", a);
  }), e.webContents.on("render-process-gone", (s, n) => {
    console.error("Processo de renderização falhou:", n);
  }), e.webContents.on("did-finish-load", () => {
    console.log("Aplicação carregada com sucesso");
  }), r || console.log("Aplicação em modo produção"), r)
    console.log("Carregando do servidor de desenvolvimento:", r), e.loadURL(r);
  else {
    const s = o.join(d, "index.html");
    console.log("Carregando arquivo local:", s);
    try {
      require("fs").existsSync(s) ? e.loadURL("app://index.html") : (console.error("❌ Arquivo index.html não encontrado, usando método tradicional"), e.loadFile(s));
    } catch (n) {
      console.error("Erro ao carregar aplicação:", n), e.loadFile(s);
    }
  }
}
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), e = null);
});
c.on("activate", () => {
  p.getAllWindows().length === 0 && g();
});
process.on("uncaughtException", (i) => {
  console.error("Erro não tratado:", i);
});
c.whenReady().then(async () => {
  r || f.handle("app", async (i) => {
    const s = i.url.slice(6), n = o.join(d, s);
    r && console.log("Servindo arquivo via protocolo app://", s);
    try {
      const a = await h(n), l = o.extname(n);
      let t = "text/plain";
      switch (l) {
        case ".html":
          t = "text/html";
          break;
        case ".js":
          t = "application/javascript";
          break;
        case ".css":
          t = "text/css";
          break;
        case ".png":
          t = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          t = "image/jpeg";
          break;
        case ".svg":
          t = "image/svg+xml";
          break;
        case ".ico":
          t = "image/x-icon";
          break;
      }
      return new Response(a, {
        headers: {
          "Content-Type": t,
          "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:;"
        }
      });
    } catch (a) {
      return console.error("Erro ao servir arquivo:", n, a), new Response("File not found", { status: 404 });
    }
  }), g();
});
export {
  b as MAIN_DIST,
  d as RENDERER_DIST,
  r as VITE_DEV_SERVER_URL
};
