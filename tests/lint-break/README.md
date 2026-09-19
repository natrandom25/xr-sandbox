# lint-break tests

These tests prove that each lint rule can fail. A rule with no failing test is a wish.

## Why the code is linted at a fake path

`lint.ts` calls ESLint's `lintText` with a `filePath` that sits inside `src/core/`
(or another real source folder). The code is never written to disk.

Do not "simplify" a test into a fixture file under `tests/`. The core-only rules
apply to files under `src/core/`. A fixture under `tests/` is outside those rules,
so it would pass lint for the wrong reason, and the test would prove nothing.

## Guards in the helper

- `lintAt` throws if the fake path is ignored by the config. A clean result on an
  ignored file means nothing.
- `lintAt` throws if the code does not parse. A typo must not look like a ban firing.
- `hits` matches rule id and message text together. Eight bans map to two built-in
  rules, so the id alone cannot tell them apart.

## Known gaps

`bypass.test.ts` lists what the rules cannot see, each with a reason, as todo entries.
