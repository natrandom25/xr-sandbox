// Content-Security-Policy strings. Pure constants, so electron.vite.config.ts can
// import them without loading Electron.

// Packaged build (G0-14): everything from the app itself, no network connections.
export const STRICT_CSP =
  "default-src 'self'; connect-src 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'";

// Dev only: the renderer comes from the Vite dev server, and HMR needs a websocket.
export const DEV_CSP =
  "default-src 'self'; connect-src 'self' ws://localhost:* http://localhost:*; " +
  "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";
