import { app, screen, session, type BrowserWindow } from "electron";

// Test hooks, inert unless one of these flags is on the command line.
//   --xr-smoke     window, WebGL 2, CSP and network checks (G0-11, G0-14, G0-15)
//   --xr-startup   first-paint time only (G0-17)
//   --xr-baseline  scene FPS search and measurement (G0-18)
// The single result line is printed to stdout as: XR_RESULT {json}

export type ProbeMode = "smoke" | "startup" | "baseline" | null;

export function probeMode(argv: string[]): ProbeMode {
  if (argv.includes("--xr-baseline")) return "baseline";
  if (argv.includes("--xr-startup")) return "startup";
  if (argv.includes("--xr-smoke")) return "smoke";
  return null;
}

function argValue(argv: string[], name: string): string | null {
  const hit = argv.find((a) => a.startsWith(`${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 1);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function readState(win: BrowserWindow): Promise<Record<string, unknown>> {
  const state: unknown = await win.webContents.executeJavaScript("window.__xr ?? {}");
  return typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
}

async function waitFor(win: BrowserWindow, key: string, timeoutMs: number): Promise<Record<string, unknown>> {
  const end = Date.now() + timeoutMs;
  let state = await readState(win);
  while (state[key] === undefined && state["error"] === undefined && Date.now() < end) {
    await sleep(200);
    state = await readState(win);
  }
  return state;
}

// Ask the renderer to fetch two http addresses. Both must fail.
const FETCH_SCRIPT = (localUrl: string) => `(async () => {
  const attempt = async (url) => { try { await fetch(url); return "reachable"; } catch { return "blocked"; } };
  return {
    external: await attempt("http://example.com/"),
    localhost: await attempt(${JSON.stringify(localUrl)}),
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content") ?? null,
  };
})()`;

async function mainFetch(url: string | null): Promise<string> {
  if (url === null) return "skipped";
  try {
    await session.defaultSession.fetch(url);
    return "reachable";
  } catch {
    return "blocked";
  }
}

async function machineInfo(): Promise<Record<string, unknown>> {
  const gpu = await app.getGPUInfo("basic").catch(() => null);
  const devices = (gpu as { gpuDevice?: Array<Record<string, unknown>> } | null)?.gpuDevice ?? [];
  return {
    electron: process.versions.electron,
    node: process.versions.node,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    packaged: app.isPackaged,
    displayHz: screen.getPrimaryDisplay().displayFrequency,
    gpu: devices.map((d) => ({ vendorId: d["vendorId"], deviceId: d["deviceId"], active: d["active"] })),
  };
}

export async function runProbe(mode: Exclude<ProbeMode, null>, win: BrowserWindow, firstPaintMs: () => number | null) {
  const argv = process.argv;
  const watchdog = setTimeout(() => {
    console.log(`XR_RESULT ${JSON.stringify({ mode, error: "watchdog timeout" })}`);
    app.exit(1);
  }, mode === "baseline" ? 15 * 60 * 1000 : 30 * 1000);

  const result: Record<string, unknown> = { mode, ...(await machineInfo()) };

  if (mode === "startup") {
    result["firstPaintMs"] = firstPaintMs();
  } else if (mode === "smoke") {
    const state = await waitFor(win, "rendered", 20000);
    const localUrl = argValue(argv, "--xr-local-url");
    const fetched: unknown = await win.webContents.executeJavaScript(FETCH_SCRIPT(localUrl ?? "http://localhost:9/"));
    Object.assign(result, {
      windowShown: win.isVisible(),
      rendered: state["rendered"] === true,
      webgl2: state["webgl2"] === true,
      glRenderer: state["glRenderer"] ?? null,
      error: state["error"] ?? null,
      firstPaintMs: firstPaintMs(),
      fetched,
      mainFetch: await mainFetch(localUrl),
    });
  } else {
    const state = await waitFor(win, "baseline", 14 * 60 * 1000);
    Object.assign(result, { baseline: state["baseline"] ?? null, error: state["error"] ?? null, glRenderer: state["glRenderer"] ?? null });
  }

  clearTimeout(watchdog);
  console.log(`XR_RESULT ${JSON.stringify(result)}`);
  win.close();
}
