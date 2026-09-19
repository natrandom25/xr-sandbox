# Slice 0 Gate: Scaffold and Baselines

Commit before Slice 0 starts.
Sign-off is recorded in CHANGELOG.md, not in this file.
If this file changes after the first check run, the run is void and the whole gate is run again.
All thresholds are stated here, before any check runs. "Auto" checks run through
npm run gate:0 and must exit non-zero on failure.

## Checks

### Toolchain
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G0-01 | Versions pinned | Every direct dependency and devDependency is an exact version (no ^, ~, ranges or tags). package-lock.json is committed. React 18.x.y. TypeScript 5.4.x. three 0.160.x. The Electron version in package.json is named in a CHANGELOG.md entry with its pin date. The Node major used for dev and vitest equals the Node major bundled in the pinned Electron (read with ELECTRON_RUN_AS_NODE=1 and process.versions.node). | Yes |
| G0-02 | App name | package.json name and productName both set and non-empty. | Yes |
| G0-03 | Strict optionals | tsconfig has strict and exactOptionalPropertyTypes true. A fixture assigning undefined to an optional field fails tsc. | Yes |

### Boundaries
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G0-04 | Import rules | One test per forbidden edge fails lint with the import rule id: renderer to storage, renderer to core/models, electron to renderer, core to anything outside types and zod, adapters to core, storage to core. | Yes |
| G0-05 | Core bans | One test per ban fails. Each test asserts both the rule id and the message text, because the eight bans map to only two built-in rules (no-restricted-properties and no-restricted-syntax). Each ban's message names the banned item, so no two tests can pass on the same message. Bans: Math.random, Date.now, performance.now, new Date, Math.hypot, Math.pow, the ** operator, the **= operator. | Yes |
| G0-06 | Bypass cases | Each of these fails lint (the test asserts rule id and message text), or is listed as a known gap with a reason in the test file: const { pow } = Math; Math['pow'](x, 2); globalThis.Date.now(). | Yes |
| G0-07 | Negative controls | Clean code at a fake path in src/core passes lint. The same banned code at a fake path in src/renderer does not trigger a core-only rule. | Yes |
| G0-08 | DOM-free core | A fixture using window, document or navigator fails tsc with the core tsconfig. A clean core file compiles. | Yes |
| G0-09 | Node tests | vitest runs one core test in the node environment. typeof window is undefined inside it. | Yes |
| G0-10 | Test method | Lint-break tests use lintText with a fake filePath inside src/core/. Fixtures are excluded from the normal lint run. Normal lint exits 0. | Yes |

### Build and offline
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G0-11 | Unpacked build | electron-builder --dir exits 0. A smoke script starts the app, sees a window, and closes it with exit code 0 within 30 s. | Yes |
| G0-12 | asar contents | asar is on. Its file listing is saved in docs. It contains no tests/, docs/, scripts/ or source map files. | Yes |
| G0-13 | Size check | scripts/size-check prints the --dir size in MB and exits non-zero above the ceiling. Ceiling is measured size times 1.2, rounded up to a whole MB. The 20% headroom was fixed before measuring. | Yes |
| G0-14 | No network | Packaged builds: the renderer has a CSP with default-src 'self' and connect-src 'none'. The main process blocks every request that is not a local file. This applies only when app.isPackaged is true. In dev, the renderer loads from the electron-vite dev URL, the request filter is off, and the CSP allows ws://localhost for Vite HMR. The smoke script runs on the packaged build only. It tries fetch to an http address and to localhost, and both fail. The app still loads under the strict CSP (G0-15 runs in the same session). | Yes |
| G0-15 | WebGL 2 | The empty Three.js scene gets a webgl2 context. A null context fails. No WebGL 1 fallback. | Yes |

### Baselines (recorded, not pass or fail)
| ID | Check | Rule | Auto |
|---|---|---|---|
| G0-16 | Machine record | CPU, GPU, RAM, disk type, OS and Electron version are written next to the numbers. | No |
| G0-17 | First launch | Median of 5 cold starts, from process start to first window painted. A cold start means the app was closed and the OS was not restarted in between runs. Individual runs are also recorded. Also record OS uptime and whether any build process ran in the preceding 5 minutes. | No |
| G0-18 | Scene FPS | Empty-scene FPS: mean over 10 s after a 2 s warm-up, plus the display refresh rate. Fixed-load FPS: the same scene plus one indexed mesh drawn in one draw call, with N triangles. N is chosen in Slice 0 between 10,000 and 5,000,000 to give 30 to 45 FPS. If no N in that range gives 30 to 45 FPS, record N = 5,000,000 (or N = 10,000 if that is already below 30 FPS) with its FPS, and mark the calibration as out of range. Same warm-up and averaging. N is recorded in the Baselines table. N is provisional under the same rule as every other baseline: it freezes only after a reference-class machine calibrates it, and the swap is recorded in CHANGELOG.md. | No |
| G0-19 | Labels | Every number is labelled reference or provisional. Reference only if the machine is Intel UHD 620 class, 8 GB RAM, SATA SSD, Windows 10 or 11. Otherwise provisional. | No |
| G0-20 | Startup limit | The 5 s limit is judged only on a reference machine. On any other machine the number is recorded and not judged. | No |

### Docs and repo
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G0-21 | 1a gate exists | docs/slice-1a-gate.md is committed. Every threshold is a number or a yes/no rule. No TBD. The cross-machine check is listed as open until the types/ freeze, with its tolerance written down. | Yes |
| G0-22 | Tree matches | Read from git ls-files, not from a filesystem walk. Top-level folders and the src/ subfolders match folder-structure.md. An unlisted tracked top-level folder fails, and so does an unlisted tracked folder inside src/. A folder listed in the tree but missing from git fails. Empty folders in the tree are tracked through a .gitkeep file. Untracked or ignored output (node_modules, out, dist) does not trigger the check. | Yes |
| G0-23 | Changelog | A Slice 0 entry is appended. Git shows only added lines in CHANGELOG.md. | Yes |
| G0-24 | Baselines table | The Baselines cells in build-order.md are fill-in locations defined by the frozen file. Filling them completes the contract and does not edit it. Cells are the only change made to that file. Each filled cell gets one dated CHANGELOG.md line with the G0-19 label. | No |

## Not checked here
Simulation determinism, the metric registry, and any experiment content. Those belong to Slice 1a.
