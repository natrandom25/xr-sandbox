import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installNetworkLock } from "./security";
import { probeMode, runProbe } from "./smoke";

const here = path.dirname(fileURLToPath(import.meta.url));
const mode = probeMode(process.argv);
let firstPaintMs: number | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    title: "XR Technology Sandbox",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  // ready-to-show fires once the first frame is painted (G0-17).
  win.once("ready-to-show", () => {
    const created = process.getCreationTime();
    firstPaintMs = created === null ? null : Date.now() - created;
    win.show();
    if (mode === "startup") void runProbe(mode, win, () => firstPaintMs);
  });

  win.webContents.once("did-finish-load", () => {
    if (mode === "smoke" || mode === "baseline") void runProbe(mode, win, () => firstPaintMs);
  });

  const hash = mode === "baseline" ? "baseline" : "";
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!app.isPackaged && devUrl !== undefined) {
    void win.loadURL(`${devUrl}#${hash}`);
  } else {
    void win.loadFile(path.join(here, "../renderer/index.html"), { hash });
  }
}

void app.whenReady().then(() => {
  installNetworkLock();
  createWindow();
});

app.on("window-all-closed", () => app.quit());
