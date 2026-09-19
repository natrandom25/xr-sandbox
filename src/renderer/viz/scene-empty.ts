import * as THREE from "three";

export interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  glRenderer: string;
  renderFrame(): void;
  dispose(): void;
}

// An empty Three.js scene on a WebGL 2 context. There is no WebGL 1 fallback:
// a null context is an error (G0-15).
export function createEmptyScene(canvas: HTMLCanvasElement): SceneHandle {
  const gl = canvas.getContext("webgl2");
  if (gl === null) throw new Error("WebGL 2 is required and is not available");

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  renderer.setPixelRatio(1);
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 10);
  camera.position.z = 2.5;

  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const glRenderer = info === null ? "unknown" : String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));

  return {
    scene,
    camera,
    glRenderer,
    renderFrame: () => renderer.render(scene, camera),
    dispose: () => renderer.dispose(),
  };
}
