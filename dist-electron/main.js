import { app as c, BrowserWindow as p, protocol as f } from "electron";
import o from "node:path";
import { fileURLToPath as m } from "node:url";
import { readFile as h } from "node:fs/promises";
const u = o.dirname(m(import.meta.url));
process.env.APP_ROOT = o.join(u, "..");
const s = process.env.VITE_DEV_SERVER_URL, R = o.join(process.env.APP_ROOT, "dist-electron"), d = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = s ? o.join(process.env.APP_ROOT, "public") : o.join(process.env.APP_ROOT, "dist");
let e = null;
function g() {
  const i = s ? o.join(process.env.APP_ROOT, "public", "logo.png") : o.join(process.env.APP_ROOT, "dist", "logo.png");
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
  }), e.webContents.on("did-fail-load", (r, n, t) => {
    console.error("Falha ao carregar a página:", n, t), setTimeout(() => {
      if (e)
        if (s)
          e.loadURL(s);
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
  }), e.webContents.setWindowOpenHandler(() => ({ action: "deny" })), e.webContents.on("console-message", (r, n, t) => {
    n >= 3 && console.error("[Renderer Error]:", t);
  }), e.webContents.on("render-process-gone", (r, n) => {
    console.error("Processo de renderização falhou:", n);
  }), e.webContents.on("did-finish-load", () => {
    console.log("Aplicação carregada com sucesso");
  }), s && e.webContents.openDevTools(), s || console.log("Aplicação em modo produção"), s)
    console.log("Carregando do servidor de desenvolvimento:", s), e.loadURL(s);
  else {
    const r = o.join(d, "index.html");
    console.log("Carregando arquivo local:", r);
    try {
      require("fs").existsSync(r) ? e.loadURL("app://index.html") : (console.error("❌ Arquivo index.html não encontrado, usando método tradicional"), e.loadFile(r));
    } catch (n) {
      console.error("Erro ao carregar aplicação:", n), e.loadFile(r);
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
  s || f.handle("app", async (i) => {
    const r = i.url.slice(6), n = o.join(d, r);
    s && console.log("Servindo arquivo via protocolo app://", r);
    try {
      const t = await h(n), l = o.extname(n);
      let a = "text/plain";
      switch (l) {
        case ".html":
          a = "text/html";
          break;
        case ".js":
          a = "application/javascript";
          break;
        case ".css":
          a = "text/css";
          break;
        case ".png":
          a = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          a = "image/jpeg";
          break;
        case ".svg":
          a = "image/svg+xml";
          break;
        case ".ico":
          a = "image/x-icon";
          break;
      }
      return new Response(t, {
        headers: {
          "Content-Type": a,
          "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:;"
        }
      });
    } catch (t) {
      return console.error("Erro ao servir arquivo:", n, t), new Response("File not found", { status: 404 });
    }
  }), g();
});
export {
  R as MAIN_DIST,
  d as RENDERER_DIST,
  s as VITE_DEV_SERVER_URL
};
