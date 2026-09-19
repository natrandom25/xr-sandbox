# Folder Structure

Status: frozen.
Purpose: fix where each kind of file lives and which folder may import which.
Every rule here is enforced by lint, tsconfig or a test. A rule with no check is a wish.

## Tree

xr-sandbox/
├─ PROJECT.md                       frozen
├─ CHANGELOG.md                     append-only
├─ package.json, tsconfig*.json, electron.vite.config, eslint config
├─ docs/
│  ├─ experiment-schema.md          frozen after Slice 1b
│  ├─ metric-catalog.md             frozen
│  ├─ folder-structure.md           this file
│  ├─ build-order.md                frozen before coding
│  └─ slice-*-gate.md               one per slice, written before the slice
├─ electron/
│  ├─ main/                         app lifecycle, window, all file IO, dialogs
│  └─ preload/                      the only bridge to the renderer (contextBridge)
├─ src/
│  ├─ types/                        frozen after Slice 1b
│  │  ├─ geometry.ts                Vec3, Quat
│  │  ├─ config.ts                  XRConfig tree, NetworkConditions
│  │  ├─ runtime.ts                 SensorSource, SensorSample, HeadPose, InputEvent
│  │  ├─ faults.ts                  FaultInjection (injectedAtLayer)
│  │  ├─ results.ts                 PredicateResult (observed: number | null),
│  │  │                             QuestionResult, DiagnosticResult
│  │  ├─ experiment.ts              Experiment, Predicate (no atSec), controls, questions
│  │  ├─ bridge.ts                  preload API surface exposed to the renderer
│  │  └─ index.ts                   re-exports
│  ├─ core/                         pure TypeScript engine
│  │  ├─ api/                       the one entry point into core (facade)
│  │  ├─ rng/                       mulberry32
│  │  ├─ sim/                       fixed-timestep loop, replay from seed + inputs
│  │  ├─ sensors/                   simulated SensorSource
│  │  ├─ models/
│  │  │  ├─ imu/  fusion/  optical/     hardware layer
│  │  │  ├─ render-cost/  pipeline/     compute layer
│  │  │  ├─ network/                    network layer
│  │  │  ├─ spatial/                    mapping, occlusion, anchors
│  │  │  └─ twin/  anomaly/  ledger/    application layer
│  │  ├─ faults/                    one file per fault kind
│  │  ├─ metrics/
│  │  │  ├─ orientation.ts  position.ts  imu.ts  filter.ts  tracking.ts
│  │  │  ├─ map.ts  occlusion.ts  anchor.ts
│  │  │  ├─ render.ts  pipeline.ts
│  │  │  ├─ network.ts  stream.ts  pose.ts
│  │  │  ├─ twin.ts
│  │  │  ├─ anomaly.ts  ledger.ts
│  │  │  └─ registry.ts             only source of metric kind, unit, aggregations
│  │  ├─ experiment/                zod schema, loader, validator,
│  │  │                             fault-requirements table, engine
│  │  ├─ grading/                   predicate evaluation, keyword matching
│  │  └─ progress/                  gating rules, overrides, completed and skipped sets
│  ├─ adapters/                     SensorSource implementations using real
│  │                                hardware APIs (empty in v1)
│  ├─ storage/                      pure logic: serialize, CSV, import validation,
│  │                                timestamps. No file IO.
│  └─ renderer/
│     ├─ app/                       entry, routing, providers
│     ├─ screens/                   unit map, experiment runner, results, instructor view
│     ├─ components/                controls, charts, question forms
│     ├─ viz/                       Three.js scenes (head model, room, network view)
│     ├─ workers/                   sim.worker.ts
│     └─ state/                     UI state
├─ content/experiments/             core experiment JSON, u1-... to u8-..., one file each
├─ tests/
│  ├─ golden/                       ground-truth traces per seed, checked into git
│  ├─ determinism/                  same-seed replay and two-machine diff
│  ├─ core/                         unit tests mirroring src/core
│  └─ lint-break/                   deliberate violations that must fail lint
├─ scripts/                         validate-content, headless-grade, size-check
└─ build/                           icons, packaging config

## Import rules (lint enforced)

| Folder | May import |
|---|---|
| types/ | nothing |
| core/ | types/, zod |
| core/api/ | the rest of core/, types/, zod |
| adapters/ | types/ |
| storage/ | types/ |
| electron/preload/ | types/ |
| electron/main/ | types/, core/api/, storage/ |
| renderer/ (incl. workers/) | types/, core/api/ |
| scripts/ | types/, core/api/, storage/ |
| tests/ | anything from src/ |

Never allowed:
- renderer/ importing storage/ or core/models/*. Profile and results reach the renderer
  through the preload bridge as plain data.
- electron/ importing renderer/.
- Anything importing a folder not in its row.
Only core/api/ is a public entry from outside core/. Other core/ folders are internal.
Tests are white-box by design and may import core/ internals directly. This is the one
exception to "only core/api/ is a public entry". Nothing imports tests/.

## Preload bridge
- electron/preload/ is the only bridge between electron/main/ and the renderer.
- The type of the API that preload exposes to the renderer via contextBridge lives in
  types/bridge.ts. Both preload and renderer import it.

## core/ rules

1. tsconfig has no DOM lib. A stray window, document or navigator reference fails the build.
2. Lint bans in src/core/**: Math.random, Date.now, performance.now, new Date,
   Math.hypot, Math.pow, and the ** and **= operators. The operators need a syntax rule
   (AST), because a name-based ban misses them.
3. Every ban has a test in tests/lint-break/ that must fail when the banned code is added.
4. core/ runs in Node. vitest tests it with no jsdom.
5. "core/ imports types/ and zod only" means project folders and one package. PROJECT.md
   stays as written.

## Lint-break tests

- Each test calls ESLint lintText with the violating code and a fake filePath inside
  src/core/, so the core-only rules apply. A fixture placed under tests/ would be outside
  the rule path and pass for the wrong reason.
- Fixtures are excluded from the normal lint run, or CI fails on them.
- Tests assert the specific rule id fires, not just "some error".

## Worker

- File: src/renderer/workers/sim.worker.ts. Under 100 lines. Message passing only.
- Imports core/api/ only. If the worker needs a rule, the rule is in the wrong place.
- Modes: run (paced to real time) and grade (as fast as possible). Same code, one flag.
- Workers can read the clock. The wall-clock ban is enforced by the core/ lint rules,
  not by the worker boundary.
- The live FPS meter lives in the renderer only. Its value never goes into core/.
- If pose streaming gets slow, switch to transferable typed arrays behind the same interface.

## Storage

- No IndexedDB. Everything is local JSON.
- src/storage/ is pure logic. All file reads and writes happen in electron/main/.
- The renderer gets profile and results from electron/preload/ as plain data.
  It never imports storage/.
- No per-tick data at runtime. A run is rebuilt from seed + config + InputEvent[].
- A stored result keeps measured values and the verdict. Grades are never recomputed
  from replay. Replay is display only and warns on engine or Electron version mismatch.
- Wall-clock stamps such as completedAtIso are added in storage/ or electron/, never in
  core/, because core/ cannot read the clock under the lint ban.
- Golden traces live in tests/golden/. Never at runtime.

## User data folder: app.getPath('userData')
The app name in package.json (name and productName) is fixed so dev and packaged
builds resolve the same folder. The folder is per OS user account.

profile.json          local profile ID, instructorMode, unlockOverrides, completed,
                      attemptedButSkipped
results/              one JSON per attempt (DiagnosticResult)
instructor-content/   instructor experiment files, merged with bundled content at load
class-imports/        folders of student JSONs for the batch view

## Content rules

- content/experiments/ is bundled read-only, one JSON file per experiment.
- Instructor files load from instructor-content/ and merge in.
- core/experiment/ accepts JSON objects, never file paths. File reading happens in
  electron/main/ (production) and scripts/ (headless). The renderer receives
  experiment definitions as plain data: bundled at build time for core content,
  through the preload bridge for instructor content. The loader takes bundled and
  instructor sets in one call, so the id-collision check sees both.
- Instructor ids must start with user-. The loader rejects a bad prefix and any id
  collision, with a readable error. It never rewrites ids, including inside prerequisites.
- Every file carries schemaVersion (number).
- The loader checks metric names and aggregations against registry.ts, and fault
  requirements against the built-in table (fault kind to required config paths).
  The schema has no requires field.
- The loader rejects any fault that starts before anomaly.baselineSec ends. It warns when
  a detection-latency experiment declares more than one fault.
- The loader warns when a layer question's correctLayer matches no injector's
  injectedAtLayer.

## Metric registry

- One file per metric domain under core/metrics/ (16 domains, matching the catalog).
- registry.ts is the only source of kind (series, series-F, series-flag, scalar), unit
  and allowed aggregations. The validator reads only the registry.
- A new domain means a new file plus registry entries. A new metric in an existing domain
  edits that domain's file plus its registry entry.

## adapters/

Holds SensorSource implementations that use real hardware APIs (navigator.serial,
navigator.hid, navigator.xr). Nothing else lives here. Empty in v1.
After v1 it gains WebSerial, WebHID and WebXR sources that emit SensorSample through the
same interface as the simulated source. No code outside adapters/ imports those APIs.

## File size

Files stay under 200 lines. Split by concern when a file passes it.
