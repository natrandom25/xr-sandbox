# XR Technology Sandbox

Offline interactive laboratory for understanding XR systems, architecture, and applications.
Tagline: Build it. Break it. Diagnose it.

## Philosophy
Learn → Observe → Manipulate → Experiment → Break → Diagnose → Apply.
Offline, guided, measurable, repeatable. Gated experiments. Automated assessment.
Teaching tool first. Reproducible by design. Research use is a bonus, not a driver.

## Audience
Engineering undergraduates (semester 5 to 8) and postgraduates. Some self-learners.
Math depth: intermediate. Equations where they matter (filters, latency budget). No formal proofs.

## Stack (pinned)
Electron (exact version pinned), electron-vite, electron-builder, React 18,
TypeScript 5.4 (exactOptionalPropertyTypes on), Three.js r160 (WebGL 2.0 only),
Vite, vitest, zod. Single npm package, no workspaces.
Storage: local JSON files through the main process. No IndexedDB. No cloud,
no accounts, no network at runtime. Ever.

## Platform and budgets
Primary: Windows 10/11, integrated GPU (Intel UHD 620 or newer). Secondary: macOS (Apple
silicon), Linux. Startup under 5 s on the reference machine. Size ceiling: 400 MB
placeholder, replaced by the measured Slice 0 number plus headroom. Unit 5 quality
settings must degrade gracefully and never crash.

Reference machine for all baselines and budgets: a lab PC with Intel UHD 620 class
integrated GPU, 8 GB RAM, SATA SSD, Windows 10 or 11.

If that machine is not available at Slice 0, the baselines measured on the
available machine are recorded as "provisional" in docs/build-order.md and are
replaced when a reference-class machine is used. Startup limit, size ceiling and
Slice 5 render cost calibration inherit this provisional label until a reference
measurement exists. A provisional number must never be silently promoted to a
baseline; the swap is recorded in CHANGELOG.md.

## Five layers
Hardware → Compute → Network → Experience → Application

## Eight units
1. XR Fundamentals (conceptual, few metrics, leans on diagnostic questions)
2. XR Hardware (IMU, 6-DoF, sensor simulation)
3. Spatial Computing (tracking, mapping, occlusion)
4. XR Networking (latency, jitter, loss, congestion)
5. XR Rendering (modeled cost, quality scaling, latency budget)
6. XR Applications (digital twins)
7. XR Security (spoofing, tampering, anomaly detection by z-score statistics, not ML)
8. Integrated Capstone (build end-to-end, break it; includes blockchain/trust layer)

## Simulation and determinism rules
1. Fixed timestep in simulated time. Never wall-clock time.
2. Seeded PRNG (mulberry32). No Math.random, Date.now, performance.now in core/ (lint ban).
3. Avoid Math.hypot, Math.pow and the ** operator in core/. Use explicit
   multiplication and Math.sqrt. Lint enforces this, same as rule 2.
4. Pin the Electron version. Grade with tolerances. Do not chase bit-exact output across machines.
5. Same seed, same machine: byte-equal. Two machines: within a documented tolerance.
6. Pass criteria are judged on simulation output only, never on renderer output.
7. Live FPS meter is ungraded and labeled "your machine". Graded render metrics come
   from the modeled cost.
8. A run is reproducible from seed + config + InputEvent[]. No per-tick storage at runtime.
   Stored results keep measured values and the verdict. Grades are never recomputed from
   replay. Replay is display only and warns on engine or Electron version mismatch.

## Experiments are data
Core experiments (40 to 50) and instructor experiments are JSON files. The engine is generic.
Every file carries schemaVersion (number). The loader rejects unknown versions, cycles in
prerequisites, non-integer durationSec * timestepHz, unknown metric names, aggregation
suffixes on scalar metrics, and faults whose required config is disabled (built-in table).
Predicates are plain data (no eval), all judged at end of run. Aggregation lives in the
metric name: domain.name[.agg][@lastNs]. No suffix window means whole run. Scalars take
no suffix at all, not even .final. The loader rejects any suffix on a scalar metric.
Instructor ids must start with user-. The loader rejects any collision or bad prefix.
No rewriting of ids.
Runtime validation is zod, matched to hand-written types by a type-equality test.

## Gating and progress
Per-experiment gating inside a unit. Unit completes when all its core experiments
pass. Instructor (user-) experiments never enter the gating chain or count toward
completion. Capstone unlocks after Units 1 to 7. Profile keeps instructorMode, unlockOverrides,
completed, and attemptedButSkipped. An override never counts as a pass.
Single user per machine, with a local profile ID. Export JSON (full session) and CSV
(grading summary). Instructors import a folder of class JSONs for a batch view.
Text answers use per-experiment keyword matching. No LLM at runtime.

## Architecture rules (lint enforced)
1. core/ imports only from types/. DOM-free tsconfig.
2. renderer/ never imports core/models/*. It uses one facade.
3. electron/ never imports renderer/.
4. Sim runs in a Web Worker. Worker file under 100 lines, message passing only.
   Run mode paces to real time. Grade mode runs as fast as possible.
5. SensorSource is the only source of sensor data for the engine. Control changes
   and fault triggers enter as logged InputEvents. In v1 it is simulated only.
   WebSerial and WebXR are future work, in adapters/ only. No hardware-specific
   code in core/ or renderer/.
6. Metrics live in core/metrics/, one folder per domain. registry.ts is the only source
   of metric kind (series or scalar).
7. adapters/ holds SensorSource implementations that use real hardware APIs
   (navigator.serial, navigator.hid, navigator.xr). Nothing else lives here.

## Build order (one vertical slice per chat)
0. Scaffold + baselines (size, first-launch time, empty-scene FPS, asar structure)
1. From 3-DoF to 6-DoF: Why IMU Alone Fails (1a headless engine, 1b UI). Review gate
   after 1a. Types and schema freeze after 1b.
2. Noise, drift, magnetometer
3. Unit 1 content, id policy, instructor import, batch view (split 3a/3b if long)
4. Network
5. Render cost and pipeline (scene complexity is an input number)
6. Spatial mapping and occlusion
7. Digital twin
8. Security attack
9. Anomaly detection (z-score statistics)
10. Blockchain and trust layer (simplified signed ledger, no EVM)
11. Capstone

## Frozen contract files
Frozen: PROJECT.md, docs/experiment-schema.md, docs/metric-catalog.md,
docs/folder-structure.md, docs/build-order.md, src/types/ (folder).
Append-only: CHANGELOG.md. Only the end may be appended to; existing entries
are never edited or removed.
Freeze times: PROJECT.md on approval. metric-catalog, folder-structure, build-order
before coding. experiment-schema and types/ after Slice 1b.
Slice gates are written checklists in docs/ (first: docs/slice-1a-gate.md).
Every gate checklist in docs/ states its pass thresholds before the check is run.
A threshold chosen after seeing the result is invalid.

## Working rules
1. Design before code. No code until I say "write code".
2. One concern per response.
3. Ask before assuming. Never invent requirements.
4. Give explicit trade-offs. Recommend one option.
5. Files under 200 lines. Propose a split if larger.
6. Assume the pinned stack. Flag deviations.
7. Never produce a 2000-line file. Propose folder structure first.
8. Respect existing code. No rewrites unless asked.
9. "Freeze" means immutable until I explicitly unfreeze.
10. Flag drift from the frozen schema.
