# Slice 1a Gate: Headless Engine

Status: working gate. Commit before Slice 0 starts.
If this file changes after the first check run, the run is void and the gate restarts.
Every threshold below is fixed before any check runs. "Auto" checks run through
npm run gate:1a and exit non-zero on failure.
Sign-off is recorded in CHANGELOG.md, not in this file (see Sign-off).

## Fixtures (fixed now)
F1: seed 1001, 60 s, 100 Hz timestep, IMU noise on, madgwick, dead reckoning then
optical fix, one slider change and one fault injector event in the input log.
Seed pairs for G1-06: (1001, 1002), (2001, 2002), (3001, 3002).

## Determinism
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G1-01 | Same machine, byte-equal | F1 run twice, each in a fresh process. Every quaternion and position component at every tick is compared as a 64-bit pattern. Zero differing bits. -0 vs 0 and NaN count as differences. | Yes |
| G1-02 | Finite output | No NaN or infinity in any pose, sample or metric of F1. | Yes |
| G1-03 | Pacing modes | Run mode and grade mode give byte-equal pose streams. | Yes |
| G1-04 | Replay | F1 rebuilt from seed + config + InputEvent[] is byte-equal to the original. | Yes |
| G1-05 | Clock independence | With Date.now and performance.now stubbed to changing values, F1 is byte-equal to G1-01. | Yes |
| G1-06 | Seed difference | For each fixed pair: orientation.errorDeg.final differs by more than 1e-4 deg AND position.errorM.final differs by more than 1e-4 m. Also, the first 100 raw gyro samples differ in at least one component, and at least 90 of those 100 differ in at least one component by more than 1e-9 deg/s. Samples are stored in rad/s, so convert to deg/s before comparing. All three pairs must pass. | Yes |
| G1-07 | Node vs Electron | F1 run in the pinned Electron and in Node on the same machine. Same tolerances as G1-08. If this fails, the fix is to run headless grading inside the pinned Electron runtime, not Node. This is a structural change to scripts/headless-grade and vitest's environment, and it becomes the task before Slice 1b starts. | Yes |
| G1-08 | Cross-machine (OPEN) | Two CPU generations, same pinned Electron version. Max over all ticks: angular difference below 1e-7 deg, position distance below 1e-9 m. Angle = 2*atan2(|v|, |w|) of the delta quaternion q1 * conj(q2), in degrees. The measured maximum is recorded even if zero. | No |

G1-07 and G1-08 both use the angle formula above. Do not use 2*acos(|dot|). Its noise
floor (about 1.7e-6 deg) is above the tolerance.

G1-08 does not block Slice 1b. It stays open until the types/ freeze. If no second
machine exists by then, freezing needs a recorded decision to accept a documented
tolerance. Do not delete this row.

Note on G1-07: it is expected to pass. Math.sqrt is exactly rounded under IEEE 754.
Math.sin, Math.cos and Math.atan2 use V8's fdlibm port. Math.pow, Math.hypot and **
are banned in core/. The real risk is that Node and Electron ship different V8
versions, and those ports have changed between versions. A failure means real code
depends on version-specific math. Better to learn that before types/ freezes.

## Physics against analytic ground truth (noise off unless stated)
| ID | Setup | Pass rule | Auto |
|---|---|---|---|
| G1-10 | Constant rotation 30 deg/s about z, madgwick, 60 s | orientation.errorDeg.max < 0.05 | Yes |
| G1-11 | Gyro bias 0.5 deg/s on z, fusion none, 60 s | orientation.errorDeg.final within 0.3 deg of 30 | Yes |
| G1-12 | Static, accel bias 0.05 m/s2 on x, dead reckoning, 60 s | position.errorM.final within 0.9 m of 90 | Yes |
| G1-13 | Gyro bias 0.5 deg/s on z, madgwick, no mag, 60 s | orientation.errorDeg.final between 28.5 and 31.5 (yaw drift stays visible) | Yes |
| G1-14 | Optical fix, opticalNoiseCm 2 per axis (standard deviation), noise on, 60 s | position.errorM.rms@last10s between 0.0294 and 0.0398 (2 cm times sqrt 3, plus or minus 15%) | Yes |

types/config.ts must state in a comment that opticalNoiseCm is the per-axis standard
deviation. G1-14 depends on it.

## Architecture
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G1-20 | Slice 0 checks still pass | npm run gate:0 exits 0. | Yes |
| G1-21 | Registry complete | All 36 catalog entries exist with kind, unit and allowed aggregations. Names have exactly two dotted parts. | Yes |
| G1-22 | Registry rules | A suffix or window on each of the 5 scalars is rejected. Any non-.final aggregation on each of the 6 F metrics is rejected. Only .final, .max, .mean are accepted on the 2 flags. @last0s, @last-1s and @lastNs above durationSec are rejected. | Yes |
| G1-23 | S1 metrics computed | orientation.errorDeg, position.errorM, imu.gyroErrDegS, imu.accelErrMs2 and tracking.lostSec return values on F1. Other metrics are registered but not computed in this slice. | Yes |
| G1-24 | Type match | The zod schema and hand-written types pass the type-equality test. Changing one field in either breaks the build. | Yes |
| G1-25 | File size | No file in src/ or tests/ has more than 200 lines. No exemptions. If a types/ file passes 200 lines, add a new file inside types/. | Yes |

## Loader
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G1-30 | Reject coverage | One or more tests per reject line in experiment-schema.md. The coverage table maps each line to its test id(s). A line with no test fails the check. The table includes a row for Observation.check with an unknown metric name, rejected with the same error as the same typo in passCriteria.measured. | Yes |
| G1-31 | Warn coverage | One test per warn line. The file still loads and the warning is returned. | Yes |
| G1-32 | Error text | The unknown-prerequisite error for a user- id contains "an instructor file it depends on may have been removed". | Yes |
| G1-33 | Start-only controls | A start-only change sent mid-run is dropped, not applied, and returned in the run output warnings array. The engine never logs. | Yes |
| G1-34 | Tables via facade | The fault-requirements table and startOnly table are re-exported by core/api/. The renderer path imports them from there only. | Yes |
| G1-35 | Margin rule | scripts/validate-content, on fixtures: (a) a core experiment whose angle threshold sits 1e-6 deg from its reference-run value fails; (b) one that sits 1e-4 deg away passes; (c) a user- experiment whose threshold sits 1e-6 deg from its reference-run value is not failed; (d) a core experiment with a measured metric that has no stated margin (fixture uses imu.gyroErrDegS) produces a warning and does not fail. scripts/validate-content emits warnings as structured output (JSON with a warnings array, or a documented line prefix) so the fixture test can assert on them. Fixture (d) passes only if the warning is present in that output and the exit code is 0. | Yes |

## Grading and export
| ID | Check | Pass rule | Auto |
|---|---|---|---|
| G1-40 | Full path | The hand-written experiment "From 3-DoF to 6-DoF: Why IMU Alone Fails" loads, runs, grades and returns a complete DiagnosticResult (all fields, revision defaulted to 1). | Yes |
| G1-41 | Fail cases | Three variants each fail for the stated reason: a measured predicate false, a required diagnostic wrong, a predicate on a null metric. | Yes |
| G1-42 | Text matching | Table tests for lowercase, trim, space collapse, substring, minMatches, distinct keywords. The negation limit is a documented case that matches. | Yes |
| G1-43 | hintsUsed | Counts distinct hints revealed. Revealing the same hint twice counts once. | Yes |
| G1-44 | Export content | The export holds seed, engine version, Electron version, config, InputEvent[], measured values, question results, hintsUsed, revision, verdict. | Yes |
| G1-45 | Export verifies | A fresh headless process re-runs the exported JSON. Measured values and verdict match. This is a check, and the stored verdict stays the record. | Yes |
| G1-46 | Boundary fields | electronVersion and completedAtIso are supplied to core/api/ by the caller. core/ reads no clock and no runtime version. | Yes |

## Author design rule
A core experiment's measured pass threshold must be more than 100 times the
cross-machine tolerance away from the metric's value on the experiment's reference run.
The reference run uses the initial config, fires every atTime injector as authored, and
includes no manual control changes or manual triggers. Angle metrics (unit deg): at
least 1e-5 deg. Position metrics (unit m): at least 1e-7 m.
scripts/validate-content runs each core experiment this way, reads each measured metric,
and fails below the margin. Core content only.

A measured metric whose family has no stated margin (currently anything that is not
angle or position, including rates such as deg/s) produces a validate-content warning,
not a failure. Each later slice that introduces a new metric family adds its margin to
this rule and turns the warning into a check for that family.

Limit: this guards the authored reference run, not every student run. A student run
that lands near a threshold can still flip across machines. The rule only stops authors
from building thresholds that sit on the reference outcome.

## Review pause
When every Auto check passes and G1-08 is recorded as open, stop. No 1b work starts
until you have read the results and recorded sign-off.

## Sign-off (recorded in CHANGELOG.md, one appended entry)
- This file's commit hash
- Machine and label (reference or provisional)
- Date
- G1-08 status: open, passed, or accepted with recorded tolerance
- Failed IDs and their fix commits
- Reviewer sign-off
