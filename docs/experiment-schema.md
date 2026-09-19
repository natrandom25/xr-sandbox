# Experiment Schema

Status: working contract for Slice 1a. Freezes after Slice 1b together with src/types/.
Until then, a field change is allowed, and every change is appended to CHANGELOG.md.
Scope: the shape of one experiment file (JSON) and every check the loader makes.
Types live in src/types/experiment.ts, faults.ts and config.ts. Types are the source
of truth. The zod schema matches them through a type-equality test. If this file and
the types disagree, that is schema drift and gets flagged.

## Shape

```ts
type Unit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type Layer = 'hardware' | 'compute' | 'network' | 'experience' | 'application';

interface Experiment {
  schemaVersion: number;
  id: string;
  title: string;
  unit: Unit;
  order: number;
  layer: Layer;
  objective: string;
  prerequisites: string[];
  run: RunSpec;
  initialConfig: DeepPartial<XRConfig>;
  controls: ControlSpec[];
  faultInjectors: FaultInjectorSpec[];
  expectedObservations: Observation[];
  diagnosticQuestions: DiagnosticQuestion[];
  passCriteria: PassCriteria;
  reflection: Reflection;
  hints: string[];
  estimatedMinutes?: number;
  tags?: string[];
  difficulty?: 1 | 2 | 3;
  author?: string;
  revision?: number;
}

interface RunSpec { seed: number; durationSec: number; timestepHz: number; }

interface ControlSpec {
  id: string;
  label: string;
  target: string;
  kind: 'slider' | 'toggle' | 'select';
  min?: number; max?: number; step?: number;
  options?: { value: string | number; label: string }[];
  unit?: string;
}

interface FaultInjectorSpec {
  id: string;
  label: string;
  fault: FaultInjection;
  trigger: { type: 'manual' } | { type: 'atTime'; sec: number };
}

interface Predicate {
  metric: string;
  op: '<' | '<=' | '>' | '>=' | 'between';
  value: number | [number, number];
}

interface Observation { id: string; text: string; check?: Predicate; }

interface QuestionBase { id: string; prompt: string; }
type DiagnosticQuestion =
  | (QuestionBase & { kind: 'choice'; options: string[]; correctIndex: number })
  | (QuestionBase & { kind: 'layer'; correctLayer: Layer; alsoAcceptable?: Layer[] })
  | (QuestionBase & { kind: 'text'; keywords: string[]; minMatches: number });

interface PassCriteria { measured: Predicate[]; requiredDiagnostics: string[]; }
interface Reflection { prompt: string; keywords?: string[]; minMatches?: number; }
```

## Field meaning
- schemaVersion: file format version, a number. The loader rejects unsupported versions.
- id, title: stable key and display name. Results and progress key on id.
- unit, order: place in a unit. order is the position in the gating chain (core only).
- layer: the layer the experiment mainly teaches.
- objective: one sentence, what the student can do afterwards.
- prerequisites: extra cross-unit dependencies. In-unit order and the capstone lock
  are derived, never written here.
- run: seed, simulated duration, fixed timestep. This makes grading reproducible.
- initialConfig: overrides on top of the defaults in core/experiment/defaults.ts.
- controls: what the student may adjust, before and during a run. target is a dot-path
  into XRConfig, for example network.conditions.latencyMs. Changes are logged as InputEvents.
- faultInjectors: faults the student triggers by hand, or that fire at a set time.
- expectedObservations: what the student should notice.
- diagnosticQuestions: choice and layer are graded exactly. text uses keyword matching.
- passCriteria: measured predicates plus the diagnostics that must be correct.
- reflection: prompt logged in the export. Keyword matches are shown as feedback only.
- hints: shown one at a time on request. Required, and may be empty.
- estimatedMinutes, tags, difficulty: browsing and planning only. Never graded.
- author: display only. Provenance comes from where the file was loaded, never from this.
- revision: content revision, defaults to 1 when omitted. Copied into
  DiagnosticResult.revision (required number) so old verdicts can be told from new ones.

## Instructor experiments and gating
- Core experiments are the bundled ones. Instructor experiments have ids starting
  with user-.
- Instructor experiments never enter the gating chain and never count toward unit
  completion. Their order is ignored. They are playable at any time unless their own
  prerequisites are unmet. A unit completes when all its core experiments pass.
- An instructor file may depend on another instructor file. A core experiment may not
  list a user- prerequisite.

## Grading
1. Every measured predicate is evaluated at the end of the run. Aggregation lives in the
   metric name (see metric-catalog.md). A null value fails its predicate.
2. Every id in requiredDiagnostics must be answered correctly.
3. passed = 1 and 2. Nothing else affects passed.
4. Not graded: expectedObservations (a check is shown as seen or not seen), optional
   diagnostics, reflection, hints. Hint use and reflection text are only recorded.
5. hintsUsed counts distinct hints revealed during the attempt, not total reveal
   requests. Revealing the same hint twice counts once.
6. Text matching: lowercase, trim, collapse spaces, then substring match per keyword.
   Correct when distinct keywords matched >= minMatches. No stemming, no synonyms.
   Known limits: variants of one idea each count as a match, and negation ("not drift")
   still matches. Use text questions for recall, and choice or layer for judgment.
7. Layer questions: the answer is correct if it equals correctLayer or is in
   alsoAcceptable. Grading reads the question only, never the fault's injectedAtLayer.

## Loader rejects (error, file does not load)
File
- unsupported schemaVersion, unknown keys, wrong types.
Identity
- id not lowercase letters, digits and hyphens.
- core id not starting with u{unit}-. Instructor id not starting with user-.
- duplicate id across bundled and instructor sets. The loader takes both in one call.
- order not a positive integer, or duplicated within a unit among core experiments.
- prerequisite that is unknown, self-referencing, or part of a cycle. An unknown
  user- prerequisite reads: unknown prerequisite user-xyz (an instructor file it depends
  on may have been removed).
- core experiment listing a user- prerequisite.
Run
- seed not an integer. timestepHz not a positive integer. durationSec not positive.
- durationSec * timestepHz not an integer.
- hardware.imu.rateHz that does not divide timestepHz.
Config and controls
- initialConfig unknown key, or merged config failing the XRConfig zod schema (ranges).
- control target that is not a leaf in XRConfig.
- slider without min, max and step, or min >= max, or step <= 0, or target not numeric.
- toggle with a non-boolean target. select with no options or options of the wrong type.
- control initial value outside its range or option list.
- duplicate control or injector ids.
Faults
- fault whose required config is disabled (built-in table, fault kind to config paths).
- atTime sec that is negative, not on a tick boundary, or >= durationSec.
- atTime sec earlier than anomaly.baselineSec when anomaly is enabled.
Metrics and predicates
- metric name unknown to registry.ts, an aggregation the metric does not allow,
  any suffix on a scalar, or @lastNs with N not a positive whole number or N > durationSec.
- Observation.check is validated identically to passCriteria.measured: metric known
  to registry.ts, aggregation allowed for that kind, no suffix on a scalar, @lastNs
  valid. Same code path, same errors.
- between with lo > hi. Non-finite values.
Questions
- duplicate question ids. choice with fewer than 2 options or a bad correctIndex.
- alsoAcceptable containing correctLayer.
- text with no keywords, or minMatches outside 1 to keywords.length.
- requiredDiagnostics id that does not exist.
- passCriteria with no measured predicate and no requiredDiagnostics.
- reflection minMatches without keywords, or above keywords.length.

## Loader warns (file loads)
- a layer question whose correctLayer matches no injector's injectedAtLayer.
- an experiment using anomaly.detectionLatencySec with more than one injector.
  Detection-latency experiments use exactly one fault.
- a prerequisite in the same unit (redundant with order).

## Runtime rules
- Every control change and fault trigger is logged with its tick as an InputEvent.
- Manual fault triggers are refused during the calibration period (first
  anomaly.baselineSec seconds) when anomaly is enabled. The UI disables the button.
  A refused trigger is not logged as an InputEvent.
- Start-only table: some config targets cannot change after Run (for example
  hardware.imu.rateHz). The table lives in core/experiment/startOnly.ts. The engine
  reads it to drop a rejected change, and the renderer reads it to disable the control.
  core/api/ re-exports it, and the fault-requirements table, so the renderer never
  imports core/experiment/ directly.
- A control whose target is in the start-only table is still validated normally, but
  the UI disables it after Run. Its initialConfig value is the only value used for the run.
- If a start-only change ever reaches the engine (a bug, a script, a future adapter),
  the change is dropped, not applied. The engine returns it in a warnings array on the
  run output. The engine never logs and never silently accepts a start-only change.

## Unit 1
Unit 1 experiments may have an empty measured list. They pass on requiredDiagnostics only.
