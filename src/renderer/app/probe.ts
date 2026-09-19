import { createEmptyScene, type SceneHandle } from "../viz/scene-empty";
import { attachLoadMesh } from "../viz/scene-fixed-load";

// Baseline harness (G0-18). Ungraded, and labelled "your machine" wherever shown.
// The FPS numbers never leave the renderer except through window.__xr.

export interface SearchStep {
  triangles: number;
  fps: number;
}

export interface BaselineResult {
  warmupSec: number;
  measureSec: number;
  emptyFps: number;
  fixedLoadFps: number;
  triangles: number;
  range: "in-range" | "capped-max" | "capped-min" | "closest";
  search: SearchStep[];
}

export interface XrProbeState {
  webgl2?: boolean;
  rendered?: boolean;
  glRenderer?: string;
  baseline?: BaselineResult;
  error?: string;
}

// The N range and the 30 to 45 FPS target are fixed in docs/slice-0-gate.md (G0-18).
const MIN_TRIANGLES = 10_000;
const MAX_TRIANGLES = 5_000_000;
const FPS_LOW = 30;
const FPS_HIGH = 45;
const WARMUP_MS = 2000;
const MEASURE_MS = 10000;
const PROBE_WARMUP_MS = 1000;
const PROBE_MEASURE_MS = 3000;

const inRange = (fps: number) => fps >= FPS_LOW && fps <= FPS_HIGH;

// Mean FPS over measureMs, after a warm-up of warmupMs.
function measureFps(handle: SceneHandle, warmupMs: number, measureMs: number): Promise<number> {
  return new Promise((resolve) => {
    let base = -1;
    let start = -1;
    let frames = 0;
    const step = (now: number) => {
      handle.renderFrame();
      if (base < 0) base = now;
      if (now - base >= warmupMs) {
        if (start < 0) {
          start = now;
        } else {
          frames += 1;
          if (now - start >= measureMs) {
            resolve((frames * 1000) / (now - start));
            return;
          }
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function chooseTriangles(handle: SceneHandle, search: SearchStep[]): Promise<{ n: number; range: BaselineResult["range"] }> {
  const probe = async (n: number) => {
    const load = attachLoadMesh(handle, n);
    const fps = await measureFps(handle, PROBE_WARMUP_MS, PROBE_MEASURE_MS);
    load.remove();
    search.push({ triangles: load.triangles, fps });
    return fps;
  };

  let lo = MIN_TRIANGLES;
  const first = await probe(lo);
  if (first < FPS_LOW) return { n: MIN_TRIANGLES, range: "capped-min" };
  if (inRange(first)) return { n: MIN_TRIANGLES, range: "in-range" };

  let hi = lo;
  let hiFps = first;
  while (hiFps > FPS_HIGH && hi < MAX_TRIANGLES) {
    lo = hi;
    hi = Math.min(hi * 2, MAX_TRIANGLES);
    hiFps = await probe(hi);
  }
  if (hiFps > FPS_HIGH) return { n: MAX_TRIANGLES, range: "capped-max" };
  if (inRange(hiFps)) return { n: hi, range: "in-range" };

  // FPS is above the band at lo and below it at hi. Bisect.
  for (let i = 0; i < 8; i += 1) {
    const mid = Math.round((lo + hi) / 2);
    const fps = await probe(mid);
    if (inRange(fps)) return { n: mid, range: "in-range" };
    if (fps > FPS_HIGH) lo = mid;
    else hi = mid;
  }
  const target = (FPS_LOW + FPS_HIGH) / 2;
  // On a tie the later probe wins. Bisection probes get heavier toward the cliff.
  const nearest = search.reduce((best, s) => (Math.abs(s.fps - target) <= Math.abs(best.fps - target) ? s : best));
  return { n: nearest.triangles, range: "closest" };
}

async function runBaseline(handle: SceneHandle): Promise<BaselineResult> {
  const emptyFps = await measureFps(handle, WARMUP_MS, MEASURE_MS);
  const search: SearchStep[] = [];
  const choice = await chooseTriangles(handle, search);
  const load = attachLoadMesh(handle, choice.n);
  const fixedLoadFps = await measureFps(handle, WARMUP_MS, MEASURE_MS);
  load.remove();
  return {
    warmupSec: WARMUP_MS / 1000,
    measureSec: MEASURE_MS / 1000,
    emptyFps,
    fixedLoadFps,
    triangles: load.triangles,
    range: choice.range,
    search,
  };
}

// Starts the empty scene. In "baseline" mode it also runs the FPS measurement.
// Returns a cleanup function.
export function startProbe(canvas: HTMLCanvasElement, mode: string): () => void {
  const state: XrProbeState = {};
  window.__xr = state;

  let handle: SceneHandle;
  try {
    handle = createEmptyScene(canvas);
  } catch (error) {
    state.webgl2 = false;
    state.error = error instanceof Error ? error.message : String(error);
    return () => undefined;
  }
  state.webgl2 = true;
  state.glRenderer = handle.glRenderer;

  let stopped = false;
  let frame = 0;
  if (mode === "baseline") {
    runBaseline(handle)
      .then((result) => {
        state.baseline = result;
      })
      .catch((error: unknown) => {
        state.error = error instanceof Error ? error.message : String(error);
      });
  } else {
    const loop = () => {
      if (stopped) return;
      handle.renderFrame();
      state.rendered = true;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    handle.dispose();
  };
}
