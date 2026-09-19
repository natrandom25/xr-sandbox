import { useEffect, useRef } from "react";
import { startProbe } from "./probe";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    return startProbe(canvas, window.location.hash.slice(1));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", margin: 16 }}>
      <h1 style={{ fontSize: 20 }}>XR Technology Sandbox</h1>
      <p>Slice 0 scaffold. The canvas below is an empty Three.js scene on WebGL 2.</p>
      <canvas ref={canvasRef} width={800} height={450} style={{ background: "#111", display: "block" }} />
    </main>
  );
}
