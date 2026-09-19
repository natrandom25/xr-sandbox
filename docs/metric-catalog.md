# Metric Catalog

Status: frozen.
The catalog is the instructor's toolbox. Experiments can only judge what is listed here.
Definitions fix meaning, unit and range. Slice designs may add implementation detail
but may not change these. A change in meaning needs an unfreeze.

## Rules
1. Every metric is a number. Flags are 0 or 1.
2. Every metric is computed from simulation state only, in simulated time.
   Never from the renderer, never from wall-clock time.
3. Kinds. series: one value per tick. scalar: one value per run.
   F (final-only): a running total or ratio, so only .final makes sense.
4. Undefined values. A metric can be undefined at a tick (for example, no packet has
   arrived yet). Event-based metrics hold their last value between events.
   Aggregations skip undefined ticks. If nothing is left, the result is null,
   and every predicate on null fails. Exports write null.
5. Units are in the name. Runtime values use the units in the table.
6. registry.ts is the only source of kind, unit and allowed aggregations.

## Naming and aggregation
Every metric name has exactly two dotted parts: domain.name. This keeps parsing
unambiguous, which is why per-stage latency is five flat metrics.
Full form: domain.name[.agg][@lastNs]
- Aggregations: .final .max .mean .rms .p95
- No suffix means .final (value at the last tick).
- No @window means the whole run. @lastNs (N a whole number, at most durationSec)
  means only the last N simulated seconds.
- .final takes no window. A window needs an explicit aggregation other than .final.
- Scalars take no suffix and no window at all, not even .final.
- F metrics allow .final only.
- Flag metrics allow .final, .max and .mean only.
The loader rejects anything else.
Examples: orientation.errorDeg.max@last10s < 2 (stays under 2 deg for the last 10 s).
position.errorM.max > 0.5 (drift became visible at some point).

## Hardware
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| orientation.errorDeg | series | deg | S1 | Angle of the rotation between estimated and true orientation. Range 0 to 180. |
| orientation.yawDriftDegPerMin | scalar | deg/min | S2 | Least-squares slope of signed yaw error (about world up) over the whole run. |
| position.errorM | series | m | S1 | Distance between estimated and true head position. |
| position.driftRateMPerMin | scalar | m/min | S2 | Least-squares slope of position.errorM over the whole run. |
| imu.gyroErrDegS | series | deg/s | S1 | Size of raw gyro reading minus true angular rate. Use .rms for the noise level. |
| imu.accelErrMs2 | series | m/s2 | S1 | Size of raw accel reading minus true specific force. |
| filter.convergenceSec | scalar | s | S2 | First time after which orientation.errorDeg stays under 5 deg to the end of the run. Null if never. |
| tracking.lostSec | series F | s | S1 | Total simulated seconds with HeadPose.tracking = 'lost'. |

## Experience (spatial computing)
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| map.coveragePct | series | % | S6 | Share of the true room surface mapped so far. Range 0 to 100. |
| map.rmsErrorCm | series | cm | S6 | RMS distance from mapped surface points to the true surface. Undefined before the first map data. |
| occlusion.correctPct | series F | % | S6 | Share of frames so far where every virtual object's hidden or visible state matches ground truth. |
| anchor.driftCm | series | cm | S6 | Mean distance between each anchored object's displayed position and its true position. |

## Compute (all modeled, never measured)
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| render.frameMs | series | ms | S5 | Modeled cost of one frame from resolution, quality and scene complexity. Minimum is the modeled cost of an empty scene. Never 0. |
| render.fps | series | fps | S5 | Modeled frame rate: the smaller of targetFps and 1000 / render.frameMs. |
| render.missedFramePct | series F | % | S5 | Share of frames so far where render.frameMs is above render.gpuBudgetMs. |
| render.gpuBudgetMs | series | ms | S5 | Per-frame time allowance in force, after any gpu.throttle fault. Shown to the student. |
| pipeline.motionToPhotonMs | series | ms | S5 | Head-pose sample to scanout: sensing + fusion + app + render.frameMs + network + scanout. |
| pipeline.sensingMs | series | ms | S5 | Modeled delay of the sensing stage. |
| pipeline.fusionMs | series | ms | S5 | Modeled delay of the fusion stage. |
| pipeline.appMs | series | ms | S5 | Modeled delay of the application stage. |
| pipeline.networkMs | series | ms | S5 | Round trip of the streamed path (uplink, encode, downlink, decode, jitter buffer). 0 in local mode. |
| pipeline.scanoutMs | series | ms | S5 | Modeled delay of display scanout. |

## Network
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| network.owdMs | series | ms | S4 | Observed one-way delay of the latest delivered packet. Not the configured value. |
| network.jitterMs | series | ms | S4 | Standard deviation of observed one-way delay over the last 1 s. |
| network.lossPct | series F | % | S4 | Observed lost / sent over the run so far. |
| network.queueDelayMs | series | ms | S4 | Time the latest delivered packet waited in the queue. |
| stream.stallSec | series F | s | S4 | Total simulated seconds with no new video frame for more than 2 frame intervals. |
| pose.stalenessMs | series | ms | S5 | Age of the newest pose the renderer used, at scanout. In steady state it equals pipeline.motionToPhotonMs when nothing is lost. During a transient (fault start, quality change) it can differ. It grows when pose packets are late or lost. |

## Application
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| twin.syncLagMs | series | ms | S7 | Age of the twin's displayed state relative to the real asset. |
| twin.divergenceNorm | series | 0 to 1 | S7 | Mean state mismatch across assets, normalized by each state's configured range. |

## Security and trust
| Name | Kind | Unit | Slice | Meaning |
|---|---|---|---|---|
| anomaly.score | series | z | S9 | Largest absolute z-score across motion features in the current window. Baseline mean and spread come from the first anomaly.baselineSec seconds of the run. Undefined during that calibration period. The loader rejects any fault that starts before the calibration period ends. |
| anomaly.detected | series | flag | S9 | 1 when anomaly.score is at or above thresholdZ. Always 0 during the calibration period. |
| anomaly.detectionLatencySec | scalar | s | S9 | First alarm time after the first fault starts, minus fault start time. Null if none. |
| anomaly.falseAlarmPct | scalar | % | S9 | Share of detector windows with an alarm while no fault is active. Windows inside the calibration period are ignored. |
| ledger.tamperDetected | series | flag | S10 | 0 until a hash-chain or signature check fails on an existing block, then 1 for the rest of the run. |
| ledger.badSignatureCount | series F | count | S10 | Total transactions that failed signature verification. |

## Unit 1
Unit 1 (XR Fundamentals) is conceptual and has no metrics. Its experiments pass on
diagnostic questions only. Authors should not look here for Unit 1 metrics.

## Limits
Predicates cannot express "max of a rolling mean" or "sustained for N seconds,
resetting on violation". Neither is needed through Slice 2. If a later experiment needs
one, add an operator then. Do not pre-build it.

## Revisit notes (for a future unfreeze)
F (final-only) covers two different things: cumulative totals (tracking.lostSec,
stream.stallSec, ledger.badSignatureCount) and running ratios (occlusion.correctPct,
network.lossPct, render.missedFramePct). On totals, F prevents nothing, since .max is
just .final. On ratios, F blocks peak-style checks such as "peak loss so far". If a
Slice 4 or 6 experiment needs a peak on a ratio, unfreeze and move that metric out of F.

## Totals
36 metrics: 23 series, 6 series-F (final only), 2 series-flag (0/1), 5 scalar (no aggregation).
