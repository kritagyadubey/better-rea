# Better-REA — final report

Fork: `kritagyadubey/better-rea`, based on `morluto/rea` at
`9593bc536` (tag `baseline-pre-better-rea`). Work branch:
`better-rea/main-work`.

This report separates what was **observed**, what is **derived from source**, and
what was **not run**. Every claim below names the command or test that produced
it, and the limitations section is part of the result.

## 1. Environment and its limits

- Windows 11 x64 host, Node.js v24.22.1, npm 11.x.
- `native/windows/build/manifest.json` and `rea-windows-x64.node` are absent.
  Every workflow that loads the Windows native controls fails closed with
  `capability_unavailable`, both before and after this work. This is the single
  largest verification limit: a few analysis tools and their browser tests
  cannot execute here.
- Ghidra, IDA, Chromium, Java and Android SDKs are not installed, so those lanes
  are **NOT RUN**. `rea setup` was not executed: it would install Hopper, and the
  task forbids unrelated installations.
- PowerShell cannot invoke `npm` directly (execution policy), so every script was
  run through `node` (for example `node node_modules/vitest/vitest.mjs`,
  `node scripts/run-typescript.mjs --noEmit`).
- `scripts/rea.mjs` serves **compiled** output from `dist/`. CLI verification
  therefore needs `node scripts/run-turbo.mjs run artifacts:skills` after a source
  change; a pre-rebuild run still shows the previous behaviour.

## 2. What changed

| Commit      | Change                                                                                   | Kind       |
| ----------- | ---------------------------------------------------------------------------------------- | ---------- |
| `45f2e6c66` | Resolve module-level `const` Electron options inside functions (#7227)                   | fix        |
| `3d48437b1` | Measure the real `tools/list` catalog across all six profiles and record the report      | docs/tools |
| `e42f4cbf9` | Guard `Object.defineProperty` descriptor overwrite order (#7219)                         | tests only |
| `dc6533d16` | Report out-of-range `generated_position` as `out_of_range` with real bounds (#7132)      | fix        |
| `19838a5ac` | Assert the same bounds through the MCP boundary                                          | tests      |
| `caff390de` | Traverse `contentSchema` and keep mixed-enum member types in advertised schemas (#7123)  | fix        |
| `1c0afcf90` | Snapshot the canonical catalog identity (231 names + six profile digests) with `--check` | safety net |

No MCP tool was renamed, removed or re-scoped. No CLI flag, package name or
Evidence field changed. Advertised schemas changed only for schemas that use a
draft 2020-12 `contentSchema` or a mixed enum containing `""`; REA's own 231
contracts use neither, and the measured catalog is byte-identical
(3,786,655 B default, 4,383,879 B complete).

## 3. Findings

### Fixed here

1. **#7227 — module-level `const` Electron options read inside a function.**
   Reported as `web_preferences_status: "dynamic"`. The read now resolves
   through `semanticConstValueAtRead`. Regression coverage: 6 cases.
2. **#7132 — out-of-range source position.** A position past the retained script
   text was refused as `invalid_format` with no coordinate and no bounds. It is
   now `out_of_range` on `["generated_position","line"]` or
   `["generated_position","column"]` with inclusive `minimum`/`maximum`, and the
   incomplete observation is still returned. `webSourcePositionOutcome` owns the
   bounds; `webSourceOffset` (also used for original-content lookups) derives from
   it, so there is one rule.
3. **#7123 — advertised input schemas.** `contentSchema` was missing from the
   shared schema-child keyword set, so literal widening, reference walks and the
   catalog-wide client-constraint guards treated it as opaque data. A mixed enum
   containing `""` (`["", 1]`) lost its member types and advertised `{}`. Both are
   fixed: `contentSchema` is traversed like `items`, and mixed enums keep their
   member types (`{"type":["string","number"]}`).
4. **Catalog identity safety net (G-1).** `docs/better-rea/golden/mcp-catalog-digests.json`
   records 231 sorted tool names and the six profile digests computed by the
   existing digest owner. `--check` names the drifting profile instead of dumping
   a whole file.

### Already fixed upstream (verified, tests added or confirmed)

- **#7219** — `Object.defineProperty` effective `value`. Closed 2026-10-26, before
  the baseline. Six descriptor orders now have regression coverage.
- **#2326 / #1401 / #7167** — checked before re-implementing; the fixes are in the
  baseline. No duplicate implementation was added.
- **#7143** — unreadable `/proc/<pid>/environ` ownership. `LinuxProcessStatus`
  derives the kernel restriction from the stat-bracketed procfs read, withheld
  rows stay unverified, and related candidates still fail closed. The relevant
  suites pass here: 33 passed, 7 skipped.

### Measured, deliberately not changed

- The default `tools/list` frame is **3.79 MB**, of which **91.6% is output
  schemas**; 231 tools already emit 9,995 shared `$defs` with **0** unreachable
  definitions. The intra-schema `$ref` ceiling is 23,415 B (0.7% of output bytes),
  so schema deduplication is not worth an emitter change.
- `REA_MCP_OUTPUT_SCHEMA_PROFILE=compact` reduces the frame to 568 KB and `off` to
  313 KB; the existing compact input profile removes 82.4% of input bytes. Both
  are already documented upstream.
- **Changing the default output profile would change the public advertisement**,
  which the task freezes. It is recorded as a measured recommendation instead:
  a host with a 1 MB frame cap cannot read the default catalog.
- `inspect_analysis_view` alone is 537,146 B of output schema (14.6% of the
  default frame) and is the largest single candidate for a per-tool budget.

## 4. Verification actually run

| Check                                                                                                                                                      | Result                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `node scripts/run-typescript.mjs --noEmit`                                                                                                                 | PASSED (exit 0), run after each change                                                             |
| `vitest run src/domain/javascript` (baseline + #7227)                                                                                                      | 6,152 passed, 12 skipped, 30 failed — the same 30 fail on the untouched baseline                   |
| `vitest run src/domain/javascript/electronWrappedCallPaths.test.ts`                                                                                        | 190 passed (184 before the #7219 guards)                                                           |
| `vitest run src/domain/webSourcePosition.test.ts src/application/WebSourceLocationService.test.ts src/javascript/sourceMaps/TraceSourceMap.test.ts`        | 59 passed                                                                                          |
| `vitest run tests/boundary/mcp/webSourceLocationMcp.test.ts --testTimeout=240000`                                                                          | 2 passed; the file needs more than the default 30 s on this host (29.1 s of work)                  |
| CLI `trace-web-source-location … 2 0` / `… 1 999` after rebuilding `dist/`                                                                                 | `out_of_range` on `line` (1–1) and `column` (0–9) with the retained-text message                   |
| `vitest run src/contracts`                                                                                                                                 | 226 passed over 23 files (4 new normalization cases)                                               |
| `vitest run tests/boundary/mcp/toolSchemaValidity.test.ts tests/boundary/mcp/compactInputSchemaMcp.test.ts tests/boundary/mcp/outputSchemaProfile.test.ts` | 34 passed                                                                                          |
| `node scripts/better-rea/measure-mcp-catalog.mjs --no-families`                                                                                            | 231 tools, 9,995 definitions, default 3,786,655 B, complete 4,383,879 B — unchanged by the fixes   |
| `node scripts/better-rea/snapshot-catalog-digests.mjs` then `--check`                                                                                      | 231 tools, 6 profiles; a hand-edited digest is reported as `profiles.compact.full.combined_sha256` |
| `vitest run src/process/ProcessOwnership.{identity,finalSweep,part2}.test.ts`                                                                              | 33 passed, 7 skipped                                                                               |
| `npm pack --dry-run --json --ignore-scripts`                                                                                                               | 2,584 files, 0 test files, 0 source maps                                                           |
| `oxlint` + `oxfmt --check` on touched files                                                                                                                | clean; only pre-existing warnings in touched files                                                 |
| `node scripts/check-doc-facts.mjs`                                                                                                                         | PASSED                                                                                             |
| `knip --cache`                                                                                                                                             | FAILED on one pre-existing unused type `HexRecordRegionMetadata`; untouched by this work           |

Pre-existing failures, reproduced on the baseline with the changes stashed:

- 30 tests in `src/browser/ElectronFileScope.cleanup.test.ts`,
  `src/browser/WebBundleAnalysisWorker.test.ts`,
  `src/browser/WebBundleAnalysisWorkerReadCompletion.test.ts` (missing native
  worker artifacts).
- `tests/acceptance/webSourceLocationCli.test.ts`: its successful-trace call needs
  the owned source-map codec, which fails closed for the same missing native files.
  Its new error-path expectations were verified through the CLI directly instead.

## 5. Not run

- Ghidra/IDA/JEB/Apktool/Frida/ADB lanes, browser capture, Windows native
  workflows, `rea setup`, and any real-provider verification: the tools or
  artifacts are absent.
- A clean-tarball install (M2) and the full `check:pr` gate: `npm pack` prepack and
  the Windows native checks need artifacts that this host does not have. `check:fast`
  components were run individually instead.
- No tokenizer ran, so all token figures are estimates labelled as such.

## 6. Remaining workstreams

| Workstream                           | Status here                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| D — Ghidra truncated bodies          | NOT RUN: no Ghidra; regression coverage confirmed to exist but not re-verified on a live cache       |
| E — performance profiling            | NOT STARTED: no bounded factorial benchmark identified; profiling needs a provider lane here         |
| F — agent usability evaluation       | PARTIAL: catalog cost measured; no model-in-the-loop trial was run                                   |
| G — provider readiness / diagnostics | PARTIAL: the catalog identity snapshot exists; `doctor` behaviour was not re-derived on a provider   |
| H — resource limits and typed errors | PARTIAL: error reasons and bounds verified for the changed workflows only                            |
| J — Windows boundaries               | PARTIAL: the honest status is recorded in this report; native lanes untestable here                  |
| K — browser connect/launch parity    | NOT RUN: no Chromium or launched browser                                                             |
| X — cross-cutting documentation      | PARTIAL: touched docs updated (`web-source-location.md`, `mcp-contracts.md`); docs fact check passes |

## 7. Reproduce

```bash
npm ci
node scripts/run-typescript.mjs --noEmit
node scripts/run-turbo.mjs run artifacts:skills
node scripts/better-rea/measure-mcp-catalog.mjs            # 6 profiles + family sweeps
node scripts/better-rea/snapshot-catalog-digests.mjs --check
node node_modules/vitest/vitest.mjs run src/contracts src/domain/webSourcePosition.test.ts \
  src/application/WebSourceLocationService.test.ts
```

The live ledger with per-item status, evidence rows and the full command log is
`docs/better-rea/PROGRESS.md`.
