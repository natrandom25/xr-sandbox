# Build Order

Status: frozen.
One vertical slice per chat. Each slice has a gate file, docs/slice-N-gate.md, written
and committed before the slice starts. This file never repeats gate thresholds.
It points to the gate file. Gate files state pass thresholds before any check is run.
A threshold chosen after seeing the result is invalid.

## Rules
1. A slice is done only when its gate file is fully ticked. "Done" here is slice-level.
   It is separate from per-experiment pass criteria.
2. A frozen contract file changes only through an explicit unfreeze. This includes
   metric-catalog.md. A slice that needs a new metric stops and asks.
3. Slices that ship content ship their own experiments. Slices that ship infrastructure
   (0, 1a) ship none. The count per slice is not fixed here.
4. "AI" in Unit 7 means z-score statistics on motion features. It is not machine
   learning. No neural network appears anywhere in this project.
5. A slice that delivers both substantial data-or-rules work (testable headless) and
   substantial UI work (only testable in-app) is split into two slices with two gate
   files. Slices 4 to 9 are split only if one genuinely contains both.
6. Total experiment count target is 40 to 50 across all slices. No per-slice count is
   fixed. A slice ships as many experiments as the material warrants. Quality of the
   shipped experiments is the criterion, not quantity.

## Baselines
Reference machine: see PROJECT.md. Every number below is labelled provisional or
reference. A provisional number is never promoted silently. The swap is recorded in
CHANGELOG.md.

The cells below are fill-in locations defined by this frozen file. Filling them
completes the contract and does not edit it. Each filled cell gets one dated
CHANGELOG.md line with its label.

| Item | Value | Label | Machine | Date |
|---|---|---|---|---|
| Installed size (--dir build) | (Slice 0) | | | |
| First-launch time | (Slice 0) | | | |
| Empty Three.js scene FPS | (Slice 0) | | | |
| Fixed-load scene FPS | (Slice 0) | | | |
| Fixed-load triangle count N | (Slice 0) | | | |
| asar structure | (Slice 0) | | | |
| Size ceiling | Measured Slice 0 --dir size x 1.2. The 20% headroom was fixed before measuring. Changing it needs an unfreeze with a recorded reason. | | | |
| Startup limit (5 s) | judged only on a reference machine | | | |

Slice 5 render cost calibration is provisional until a reference-class machine is
measured. A fast dev machine must not set the reference point of the cost model.
N is provisional under the same rule.

## Slices

### 0. Scaffold and baselines
Scope: electron-vite + React + TS app. Electron version pinned exactly. package.json
name and productName fixed. exactOptionalPropertyTypes on. Lint import rules from
folder-structure.md. Lint bans in src/core/**, including ** and **= as an AST rule.
tests/lint-break/ with one test per ban, using lintText and a fake filePath inside
src/core/. DOM-free tsconfig for core, with a check that a stray window fails the build.
vitest running on core. electron-builder --dir build. scripts/size-check. Baselines
recorded. docs/slice-1a-gate.md is committed before the scaffold starts and lists the
cross-machine check as open until the types/ freeze.
Why first: cheap now, painful to retrofit. The size ceiling and baselines come from here.
Done: every lint-break test fails the build as required; the --dir build runs; the
Baselines table is filled and labelled; the 1a gate file exists with thresholds.
Gate: docs/slice-0-gate.md

### 1a. From 3-DoF to 6-DoF: Why IMU Alone Fails (headless engine)
Scope: RNG, sim loop, IMU model, Madgwick, dead reckoning, optical fix, metric
registry (all 36 entries, only S1 metrics computed), zod schema + loader + validator,
grading, DiagnosticResult, JSON export logic, one hand-written experiment JSON, vitest,
determinism tests.
Why here: everything else depends on the engine this forces into existence.
Done: docs/slice-1a-gate.md fully ticked, including same-machine byte-equality and the
different-seed test. The cross-machine check does not block 1b. Review pause. No 1b
work before that.
Gate: docs/slice-1a-gate.md

### 1b. Same experiment, UI
Scope: runner screen, Three.js head model, controls, question forms, results screen,
export through electron/main, preload bridge, types/bridge.ts, worker.
Why after 1a: UI work forces type changes. Types and schema freeze here, not earlier.
Done: one student can run the experiment end to end in the app, submit answers, and
export a JSON that reproduces the verdict headless. types/ and experiment-schema.md
freeze only after the cross-machine check passes on a second CPU generation, or after a
recorded decision to accept a documented tolerance.
Gate: docs/slice-1b-gate.md

### 2. Noise, drift, magnetometer
Scope: bias walk, yaw drift, mag sensor (noiseUT, hardIronUT only), the S2 scalars,
first use of @lastNs windows on real experiments.
Why here: stresses metric kinds and windows while the engine is fresh.
Done: the scalar metrics match analytic ground truth within tolerances stated in the
gate; a loader test rejects a suffix on each scalar.
Gate: docs/slice-2-gate.md

### 3a. Unit 1 content, ids, import, progress
Scope: about 5 conceptual experiments with no metrics, user- id policy and collision
checks, loading instructor-content/, progress module (gating, unlockOverrides,
completed, attemptedButSkipped, capstone lock; user- experiments stay outside gating
and unit completion), class-import validation.
Done: gating rules pass tests with fake content for all eight units; an instructor file
loads; a bad prefix and a collision are rejected with readable errors.
Gate: docs/slice-3a-gate.md

### 3b. Instructor view
Scope: batch view of imported class JSONs, override controls, CSV export of a class set.
Done: a folder of class JSONs produces a batch view and a CSV that match the headless
grade of the same files.
Gate: docs/slice-3b-gate.md

### 4. Network
Scope: latency, jitter, loss (random and burst), congestion, queue, stall. Observed
metrics differ from configured ones.
Why here: first slice where observed and configured values diverge.
Done: observed owd, jitter and loss match the configured model within stated
tolerances over long runs; net faults work.
Gate: docs/slice-4-gate.md

### 5. Render cost and pipeline (Unit 5)
Scope: modeled frame cost, quality scaling, latency budget, pose.stalenessMs, live FPS
meter beside the modeled value. Scene complexity is an input number, not read from a
fixed config value, so Slice 6 can supply its own.
Why after 4: pipeline.motionToPhotonMs sums network and compute stages.
Done: cost model matches a hand-computed table; frameMs never 0; the app degrades
quality without crashing on the baseline machine. Calibration is labelled provisional
unless a reference measurement exists.
Gate: docs/slice-5-gate.md

### 6. Spatial mapping and occlusion
Scope: mapping, occlusion, anchors, the S6 metrics, complexity fed into the render model.
Why here: heaviest Three.js slice, after the engine settled.
Done: mapping error and occlusion metrics match ground truth in a synthetic room.
Gate: docs/slice-6-gate.md

### 7. Digital twin
Scope: twin sync using the network model. Metrics twin.*.
Done: sync lag equals the modeled path delay within tolerance.
Gate: docs/slice-7-gate.md

### 8. Security attack
Scope: pose.spoof fault only. No new metrics. Experiments are judged on existing
metrics (for example position.errorM, orientation.errorDeg) plus diagnostic questions.
The ledger.tamper fault belongs to Slice 10.
Why before detection: students see the attack, then build the detector.
Done: a ramped spoof changes the pose stream as specified and is invisible to a
single-sample check; experiments load and grade.
Gate: docs/slice-8-gate.md

### 9. Anomaly detection (z-score statistics)
Scope: fixed calibration period (anomaly.baselineSec), z-score on motion features,
S9 metrics, loader rules for faults inside the calibration period.
Done: on seeded clean runs the false alarm rate matches the threshold within a stated
tolerance; the attack from Slice 8 is detected with a measured latency.
Gate: docs/slice-9-gate.md

### 10. Blockchain and trust layer
Scope: first, review the existing Blockchain Systems Laboratory code and decide what is
reused. Then a simplified ledger: signed transactions, hash chain, tamper detection.
No EVM. The ledger.tamper fault and its requirements-table entry.
Done: tamper and bad-signature cases are detected in every seeded test; clean runs
never alarm.
Gate: docs/slice-10-gate.md

### 11. Capstone
Scope: integration, Units 1 to 7 lock, end-to-end experiments across layers.
Done: a full capstone attempt runs headless and in the UI with the same verdict.
Gate: docs/slice-11-gate.md

## Carried into later files
- types/runtime.ts gets SensorSource. types/bridge.ts is new.
- ApplicationConfig gets anomaly.baselineSec.
- PredicateResult.observed is number | null. Predicate loses atSec.
- DiagnosticResult.revision is a required number.
- FaultBase.layer becomes injectedAtLayer.
- experiment-schema.md: single fault for detection-latency experiments; faults may not
  start before calibration ends.
- The fault-requirements table grows one entry per fault kind, in the slice that adds it.
