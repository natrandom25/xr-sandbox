import type { XrProbeState } from "./probe";

declare global {
  interface Window {
    // Written by the renderer, read by the main-process test hooks.
    __xr?: XrProbeState;
  }
}
