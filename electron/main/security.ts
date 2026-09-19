import { app, session } from "electron";

export function isLocalFile(url: string): boolean {
  return url.startsWith("file://");
}

// G0-14: in a packaged build, every request that is not a local file is cancelled,
// and windows and navigation are locked. In dev the renderer loads from the Vite
// dev server, so none of this applies.
export function installNetworkLock(): void {
  if (!app.isPackaged) return;

  session.defaultSession.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
    callback({ cancel: !isLocalFile(details.url) });
  });

  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-navigate", (event) => event.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
  });
}
