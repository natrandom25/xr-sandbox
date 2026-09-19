# Changelog

Append-only. Only the end of this file is ever added to. Existing entries are never
edited or removed. Every entry is dated (YYYY-MM-DD).

## 2026-09-19 Slice 0: decisions before code

Contract files
- Committed as the contract set: PROJECT.md, docs/experiment-schema.md,
  docs/metric-catalog.md, docs/folder-structure.md, docs/build-order.md.
  experiment-schema.md stays a working contract until Slice 1b.
- PROJECT_1.md and slice-1a-gate_1.md were duplicates and are not used. PROJECT_1.md
  held the older gating line, which conflicts with experiment-schema.md.
- docs/slice-0-gate.md was amended before its first check run. Rows changed: G0-01,
  G0-05, G0-06, G0-14, G0-18, G0-22. All other rows are as first written.
- docs/slice-1a-gate.md is committed as written, with G1-08 open.

Stack and tooling
- Electron is pinned exactly, to one of the latest three stable majors on the pin
  date. The version and the pin date go in a separate entry, appended when
  package.json is created. The dev and vitest Node major must equal the Node major
  bundled in that Electron (G0-01).
- Deviation accepted: dev dependencies are added beyond the PROJECT.md stack list, and
  pinned exactly. This covers eslint, typescript-eslint, @vitejs/plugin-react,
  @electron/asar and the @types packages. G0-01 requires every direct dependency to be
  an exact version.
- Gate and build scripts are plain .mjs files that use only Node built-ins. TypeScript
  scripts that import types/ or core/api/ start in Slice 1a.
- package.json name is xr-sandbox. productName is XR Technology Sandbox.
- electron/preload/ has only a .gitkeep until Slice 1b. The electron-vite config does
  not reference a preload file before then.

Repo rules
- New files may be added inside listed folders. Exception: no new files inside
  src/types/ after its freeze.
- Empty folders in the tree are tracked through a .gitkeep file (G0-22).
- .gitattributes was committed alone, before any other file, so frozen .md files enter
  git with LF line endings.
- Working exception, approved for Slice 0 only: the .gitkeep files go in one batch and
  the two stubs (src/types/index.ts, src/core/api/index.ts) go in one batch. All other
  files go one per response.

Baselines
- The Baselines table in docs/build-order.md is the source of truth for the size
  ceiling. The 400 MB in PROJECT.md is a placeholder by its own text and stays
  untouched.
- Slice 0 baselines are taken on the current gate machine and labelled provisional.
  The only labels are reference and provisional (G0-19).
- The fixed-load triangle count N is chosen between 10,000 and 5,000,000, with one
  indexed mesh in one draw call. The range was fixed before any measurement (G0-18).

Carried to later slices
- Slice 3a needs an unfreeze decision. PROJECT.md says no accounts and single user per
  machine, which conflicts with multi-user profiles and a licence file.
- Slice 0 builds with electron-builder --dir only. No slice yet names building the
  Windows installer (NSIS). It must be settled before any build is handed to an
  institute.

## 2026-09-19 Slice 0: dependency pins (G0-01)

Runtime and language
- Electron 44.4.3, pinned exactly. Pin date 2026-09-19. It was the newest 44.x on the
  npm registry that day (published 2026-09-18). 44 is one of the latest three stable
  majors.
- Node: package.json engines is ^24.0.0. Electron 44.0.0 bundles Node 24.18.1. The Node
  bundled in 44.4.3 is checked after npm install, with ELECTRON_RUN_AS_NODE=1, and
  recorded in a later entry.
- TypeScript 5.4.5. three 0.160.1 with @types/three 0.160.0. react and react-dom 18.3.1
  with @types/react 18.3.31 and @types/react-dom 18.3.7.
- zod 4.6.5. A scratch project compiled it cleanly under TypeScript 5.4.5 with strict
  and exactOptionalPropertyTypes on, with skipLibCheck off.

Build chain
- Vite is 7.3.6, not the newest 8.x. electron-vite 5.0.0 supports Vite 5 to 7 only.
- @vitejs/plugin-react is 5.2.0, not 6.x. Version 6 needs Vite 8. Version 5.2.0
  accepts Vite 4 to 8.
- vitest 5.0.1 accepts Vite 6 to 8, so it fits under Vite 7.
- Also pinned: electron-builder 26.15.3, electron-vite 5.0.0, @electron/asar 4.3.0,
  @types/node 24.13.6.
- eslint 10.11.0 with typescript-eslint 8.70.0. The typescript-eslint peer range names
  ESLint 10 and TypeScript below 6.1.
- npm install --package-lock-only on the full set finished with no peer conflicts.

package.json choices
- Every package is in devDependencies. The bundler inlines them into out/, and
  electron-builder packs only dependencies into the asar, so the size baseline stays
  small.
- type is module. main is ./out/main/index.js, an assumption to confirm when the
  electron-vite config exists.
- No author or license field is set. That is an owner decision.

## 2026-09-19 Slice 0: tsconfig layout and typecheck script

Amends the package.json choices in the dependency-pins entry above.
- The typecheck script is three chained runs (tsc -p for core, node and web, each with
  noEmit). It replaces tsc -b.
- There are no project references. References force composite and declaration emit,
  which risks TS2742 "cannot be named" errors on zod-inferred types in Slice 1a.

Configs (four, not five)
- tsconfig.json: shared options (strict, exactOptionalPropertyTypes, isolatedModules,
  skipLibCheck, noEmit). It also lists the source folders, so editors use it as the
  default project.
- tsconfig.core.json: lib ES2022, no types. Includes src/core and src/types. A stray
  window, document, process or setTimeout fails here.
- tsconfig.node.json: lib ES2022, node types, no DOM. Includes electron/, tests/ and
  the root config files.
- tsconfig.web.json: lib ES2022 plus DOM, no types. Includes src/renderer and
  src/types.
- G0-08 catch-up: an earlier plan listed a fifth file, tsconfig.test.json. G0-08 does
  not call for it. Tests import describe, it and expect from vitest, with globals off,
  and live in tsconfig.node.json. They cannot share the core program, because vitest's
  own type files need Node or DOM types.

skipLibCheck is true, for two reasons
- The electron-vite type file imports @swc/core, an optional peer that is not installed.
- zod's type files use URL, which is not in lib ES2022. Core must keep skipLibCheck on.

Notes
- Editor: the editor uses tsconfig.json, which has strict on, DOM and all @types, so it
  does not enforce core purity. npm run typecheck does.
- The G0-09 test checks "window" in globalThis, because the node config has no DOM lib.
- tsc -p tsconfig.core.json reports no inputs until src/types/index.ts and
  src/core/api/index.ts exist.
- Slice 1b will need vite/client types if the worker uses ?worker, and worker types for
  sim.worker.ts.

## 2026-09-19 Slice 0: scaffold build

Amends the dependency entry above
- @vitejs/plugin-react is 4.7.0, not 5.2.0. The 5.2.0 type file exports a name as a
  string literal, which TypeScript 5.4.5 cannot parse (TS1003), and skipLibCheck does
  not hide a syntax error. 4.7.0 accepts Vite 7. The earlier dry resolve did not
  type-check, so it missed this.
- Electron 44.4.3 bundles Node 24.21.0 and V8 15.2, read with ELECTRON_RUN_AS_NODE=1.
  Node 24.18.1 has V8 13.6, so the gap G1-07 tests for is real and expected.

Files added beyond the earlier lists
- Root: eslint.boundaries.js, vitest.config.ts, package-lock.json.
- electron/main/: csp.ts, security.ts, smoke.ts.
- scripts/: run-app.mjs, smoke.mjs, baseline.mjs, check-asar.mjs, size-check.mjs,
  check-toolchain.mjs, check-repo.mjs, gate-0.mjs.
- tests/lint-break/: bans, bypass, imports, controls and tsc tests, plus README.md.
  tests/core/env.test.ts.
- docs/slice-0-asar-listing.txt, written by scripts/check-asar.mjs. G0-12 says the
  listing is saved in docs.
- package.json gains a baseline script.

Decisions in the build
- The import rule is a local ESLint rule (eslint.boundaries.js), so no plugin is added.
  It resolves relative imports and checks folder kinds against the table in
  folder-structure.md. Reading of the table: core files other than core/api may not
  import core/api. Bare packages: types/ takes none, core/ takes zod only.
- ESLint runs only the core bans and the import rule. No recommended rule set is on.
- The CSP is set in index.html at build time by electron.vite.config.ts, from
  electron/main/csp.ts: strict for a build, relaxed for dev. The request filter and the
  navigation lock apply only when app.isPackaged.
- The flags --xr-smoke, --xr-startup and --xr-baseline are handled in
  electron/main/smoke.ts. They do nothing without a flag, and they ship in the packaged
  app.
- appId is not set, and electron-builder warns that author is missing. Both are owner
  decisions.
- The G0-03 and G0-08 fixtures are in-memory files, so no fixture files exist (G0-10).
- npm run baseline does 5 fresh launches for the startup median, then one FPS run with
  the N search from G0-18.

Where it was run
- Build, tests and the smoke test ran on Linux x64 in a container, with Xvfb and
  software WebGL (SwiftShader). Nothing measured there is a baseline.
- Still to do on the Windows gate machine: npm run baseline, the Baselines table cells
  in docs/build-order.md (G0-24), the size baseline for G0-13, and sign-off.
