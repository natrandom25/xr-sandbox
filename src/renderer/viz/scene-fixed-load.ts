import * as THREE from "three";
import type { SceneHandle } from "./scene-empty";

export interface LoadMesh {
  triangles: number;
  remove(): void;
}

// The fixed load: a flat grid of quads, two triangles each. One indexed mesh,
// one draw call. The real triangle count is 2 * cells * cells, so it can be a
// little above the request.
export function attachLoadMesh(base: SceneHandle, triangles: number): LoadMesh {
  const cells = Math.max(1, Math.ceil(Math.sqrt(triangles / 2)));
  const side = cells + 1;

  const positions = new Float32Array(side * side * 3);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const i = (y * side + x) * 3;
      positions[i] = (x / cells) * 2 - 1;
      positions[i + 1] = (y / cells) * 2 - 1;
      positions[i + 2] = 0;
    }
  }

  const indices = new Uint32Array(cells * cells * 6);
  let k = 0;
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const a = y * side + x;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices[k] = a;
      indices[k + 1] = b;
      indices[k + 2] = c;
      indices[k + 3] = b;
      indices[k + 4] = d;
      indices[k + 5] = c;
      k += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const material = new THREE.MeshBasicMaterial({ color: 0x3388ff });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  base.scene.add(mesh);

  return {
    triangles: cells * cells * 2,
    remove() {
      base.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
