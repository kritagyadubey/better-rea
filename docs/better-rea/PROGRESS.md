# Better-REA — Progress Ledger

> Continuously updated. Re-read at the start of every phase.

**Project:** Better-REA — Better Reverse Engineer Anything
**Upstream (read-only):** https://github.com/morluto/rea @ `9593bc536b0549f0997e6b7922904f8fd1e91021` (2026-10-28, `rea-agents@6.8.0`, 593 commits past tag `rea-agents-6.8.0`)
**Destination:** https://github.com/kritagyadubey/better-rea (origin)
**Work branch:** `better-rea/main-work`
**Baseline tag:** `baseline-pre-better-rea`
**Baseline evidence:** `docs/better-rea/baseline-report.md`
**Final report:** `docs/better-rea/FINAL_REPORT.md`

## Status key

| Status        | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| NOT STARTED   | Not investigated yet                                               |
| IN PROGRESS   | Actively being worked                                              |
| DONE-VERIFIED | Implemented **and** a named command was run with a recorded result |
| PARTIAL       | Some sub-items done and verified, remainder listed                 |
| DEFERRED      | Deliberately not done, with reason                                 |
| BLOCKED       | Cannot proceed, with reason                                        |

Evidence labels used everywhere in this repository's Better-REA docs:
**VERIFIED** = I ran it. **INFERRED** = reasoned from source, not run. **UNVERIFIED** = could not run.

---

## Phase 0 — Inputs, discovery, safety net

| #   | Item                                                                    | Status        | Evidence / notes                                                                                                                |
| --- | ----------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | Read Source A `REA_final_actionable_improvement_backlog.txt` end to end | DONE          | 904 lines read in full. Found at `C:\Users\krita\Downloads\`.                                                                   |
| 0.2 | Read Source B `REA_WEAKNESSES_AND_IMPROVEMENTS.txt` end to end          | DONE          | 1341 lines read in full. Found at `C:\Users\krita\OneDrive\Documents\Default Project\`.                                         |
| 0.3 | Merge both into one de-duplicated checklist                             | DONE          | This file (workstreams A–M + cross-cutting 1–13).                                                                               |
| 0.4 | Licence check before copying                                            | DONE-VERIFIED | `gh repo view morluto/rea` → MIT. LICENSE preserved in tree.                                                                    |
| 0.5 | Clone with upstream history, remotes separated                          | DONE-VERIFIED | `git remote -v`: origin=better-rea, upstream=rea, `upstream` push = `DISABLED`.                                                 |
| 0.6 | Baseline tag created                                                    | DONE-VERIFIED | `git tag -a baseline-pre-better-rea`.                                                                                           |
| 0.7 | Baseline verification recorded                                          | DONE-VERIFIED | `docs/better-rea/baseline-report.md`: typecheck/format/docs PASSED, 30 native-worker failures, one pre-existing `knip` finding. |

---

## Workstream A — MCP catalog size / agent context cost

Source: master §6 Phase 4 A, source A A1/A9/A7, source B 4.1/4.2/4.3/4.6/8.4, issues #7155, discussion #3098.

| #   | Item                                                                           | Status                       | Commit      | Verification                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------ | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Measure serialized `tools/list` bytes, input vs output schema share            | DONE-VERIFIED                | `3d48437b1` | `node scripts/better-rea/measure-mcp-catalog.mjs` → default 3,786,655 B; output schemas 3,469,986 B (91.6%), input schemas 127,195 B (3.4%)                                                                                                |
| A2  | Measure real token counts for representative tokenizers                        | DEFERRED                     | —           | Two independent **estimates** recorded instead (`/4` → 946,664; structural → 432,565 for the default frame). No tokenizer ran, so no measured count is claimed.                                                                            |
| A3  | Profile largest input/output schemas for repeated structure                    | DONE-VERIFIED                | `3d48437b1` | 231 tools already emit 9,995 shared `$defs`; **0** unreachable definitions; intra-schema refactoring ceiling 23,415 B = 0.7% of output bytes. Largest tool = `inspect_analysis_view`, 537,146 B output schema, 14.6% of the default frame. |
| A4  | Safe schema deduplication / shared contract construction                       | DEFERRED                     | —           | Measured ceiling is 0.7%: the emitter already deduplicates, so there is no material win to justify a schema-emitter change. Revisit only if a large unreachable-`$defs` regression appears.                                                |
| A5  | Task-family presets (native, JS/Electron, browser/network, artifacts, session) | DONE-VERIFIED (pre-existing) | —           | Already shipped: `REA_MCP_TOOL_FAMILIES`, 18 families in `src/contracts/toolFamilies.ts`, `rea setup --tool-families`. Measured per-family frames; largest single family is `direct` at 456,248 B (12.0% of the default frame).            |
| A6  | Preserve FULL canonical inventory; no tool removed; validation intact          | DONE-VERIFIED                | —           | 231 tools advertised in every profile; no tool list changed. `mcp-catalog:check` and the contract tests are untouched.                                                                                                                     |
| A7  | Before/after report with real measurements                                     | DONE-VERIFIED                | `3d48437b1` | `docs/better-rea/benchmarks/mcp-catalog.md` + `.json`.                                                                                                                                                                                     |

### A — measured findings and decisions

Measured on the compiled server over the SDK in-memory transport, 231 tools:

| Input / output profile       | Frame bytes | Input schemas | Output schemas |
| ---------------------------- | ----------- | ------------- | -------------- |
| `compact` / `full` (default) | 3,786,655   | 127,195       | 3,469,986      |
| `compact` / `compact`        | 567,965     | 127,195       | 251,296        |
| `compact` / `off`            | 312,973     | 127,195       | 0              |
| `full` / `full`              | 4,383,879   | 724,419       | 3,469,986      |
| `full` / `compact`           | 1,165,189   | 724,419       | 251,296        |
| `full` / `off`               | 910,197     | 724,419       | 0              |

- The compact input profile already removes 82.4% of input bytes; the compact
  output profile removes 92.8% of output bytes. Both mechanisms exist upstream
  and are documented, so no new profile was added.
- **The default advertisement is 3.79 MB, and 91.6% of it is output schemas.**
  A host with a 1 MB frame cap (the cap cited in #2512) cannot read the default
  catalog. `REA_MCP_OUTPUT_SCHEMA_PROFILE=compact` brings it to 568 KB.
- **Decision (deferred):** changing the default output profile is a public
  advertisement change, not an additive one, so it is left as a documented,
  measured recommendation for the maintainer rather than changed here. The
  measured numbers are now recorded so the decision can be made on evidence.
- `inspect_analysis_view` alone is 537,146 B of output schema (14.6% of the
  default frame) for a tool with two input properties; it is the single largest
  candidate if a per-tool schema budget is ever introduced.
- Reproduce with `node scripts/better-rea/measure-mcp-catalog.mjs` after
  `npm run build:cached`.

## Workstream B — JavaScript/Electron analysis correctness

Source: master §6 Phase 2 B, source A A2 (#7219), A3 (#7227), B9, source B 11.x.

| #   | Item                                                                       | Status        | Commit        | Verification                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Reproduce #7219 `Object.defineProperty` first-vs-effective `value`         | DONE-VERIFIED | see B1 commit | Issue text read; HEAD already selects the effective (last) `value` through `staticObjectPropertyReader` in `#indexWriteSite`. A probe of all six descriptor orders through the compiled domain pipeline produced the expected result.                                                                         |
| B2  | Respect JS overwrite order for duplicate descriptor keys (both orders)     | DONE-VERIFIED | see B1 commit | New block in `electronWrappedCallPaths.test.ts` → "defineProperty descriptor overwrite order": sender→no-op yields no candidate; no-op→sender yields `api.copy` and `descriptor:copy`.                                                                                                                        |
| B3  | Literal spreads in both orders                                             | DONE-VERIFIED | see B1 commit | Same block: `...{value: sender}` and `...{value: no-op}` in both orders.                                                                                                                                                                                                                                      |
| B4  | Computed `"value"` keys / dynamic spreads / getters keep uncertainty       | DONE-VERIFIED | see B1 commit | Literal computed `["value"]` keys in both orders added; dynamic spreads, unknown keys and accessors already covered by `javascriptSymbolicBindings.test.ts` → "preserves effective descriptor value uncertainty".                                                                                             |
| B5  | CLI and MCP produce equivalent candidate paths + uncertainty               | PARTIAL       | —             | Both adapters dispatch to the same `analyzeJavaScriptStaticSource` domain path (INFERRED from source). The CLI end-to-end run is **BLOCKED** on this Windows host: `analyze-javascript-application` fails closed with `capability_unavailable` because `native/windows/build/rea-windows-x64.node` is absent. |
| B6  | Reproduce #7227 module-level `webPreferences` seen as dynamic in functions | DONE-VERIFIED | —             | Probe on `analyzeJavaScriptStaticSource`: `web_preferences_status: "dynamic"`, `web_preferences: []`                                                                                                                                                                                                          |
| B7  | Resolve provably-stable module-level constants across function boundaries  | DONE-VERIFIED | `45f2e6c66`   | `semanticConstValueAtRead` in `javascriptSemanticMutationInitializers.ts`                                                                                                                                                                                                                                     |
| B8  | Whole-options object form + `app.whenReady().then(...)` callback           | DONE-VERIFIED | `45f2e6c66`   | Tests "resolves a module-level immutable preferences object inside an app.whenReady() callback" + "resolves a module-level whole-options object through a function"                                                                                                                                           |
| B9  | Mutation/escape/export/computed-update stay conservative                   | DONE-VERIFIED | `45f2e6c66`   | `it.each` "keeps a module-level preferences object unknown after ..." (3 cases) + "does not resolve a const read before its declaration in the same function"                                                                                                                                                 |
| B10 | JS/Electron semantic regression corpus consolidated                        | PARTIAL       | `45f2e6c66`   | Renderer receiver-chain case added; #7219 descriptor-order corpus (6 cases) added                                                                                                                                                                                                                             |

## Workstream C — Schema / handler / CLI / MCP contract conformance

Source: master §6 Phase 2 C, source A A4 (#7123), B2, source B 4.x/5.x.

| #   | Item                                                                       | Status          | Commit      | Verification                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------- | --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Reproduce #7123 `contentSchema` / tuple `items` / mixed enum normalization | DONE — VERIFIED | `caff390de` | Reproduced on HEAD: `contentSchema: {const:""}` stayed literal, `enum: ["",1]` became `{}`, tuple `[{const:""}]` was already widened. Parts 1 and 3 fixed; part 2 was already fixed upstream by the shared `clientSchemaPositions` traversal |
| C2  | Contract-conformance suite derived from canonical definitions              | PARTIAL         | `caff390de` | `src/contracts/inputSchemaPresentation.test.ts` pins the normalization contract; the catalog-wide guards stay in `toolSchemaValidity.test.ts`, `compactInputSchemaMcp.test.ts` and `outputSchemaProfile.test.ts` (all passing)               |
| C3  | Every advertised enum value accepted; invalid combos rejected early        | NOT STARTED     | —           | —                                                                                                                                                                                                                                            |
| C4  | `inspect_analysis_view` selector schema vs runtime parity                  | NOT STARTED     | —           | —                                                                                                                                                                                                                                            |
| C5  | Setup/doctor client-ID registry vs parser parity                           | NOT STARTED     | —           | —                                                                                                                                                                                                                                            |
| C6  | CLI and MCP accept/reject equivalent logical requests                      | NOT STARTED     | —           | —                                                                                                                                                                                                                                            |

## Workstream D — Native analysis coverage (Ghidra truncated bodies)

Source: master §6 Phase 3 D, source A A5 (#2326, PR #2360), B1, source B 11.x.

| #   | Item                                                                    | Status      | Commit | Verification |
| --- | ----------------------------------------------------------------------- | ----------- | ------ | ------------ |
| D1  | Confirm short-body warning regression coverage exists                   | NOT STARTED | —      | —            |
| D2  | Truncated-body fixtures for callers and callees independently           | NOT STARTED | —      | —            |
| D3  | Never invent call edges; missing-information vs none-found separated    | NOT STARTED | —      | —            |
| D4  | Coverage fields keep original meaning (never turn partial into absence) | NOT STARTED | —      | —            |

## Workstream E — Performance benchmarks and profiling

Source: master §6 Phase 4 E, source A A6 (#1401, #1387), source B 8.x.

| #   | Item                                                                     | Status      | Commit | Verification |
| --- | ------------------------------------------------------------------------ | ----------- | ------ | ------------ |
| E1  | Confirm factorial member-reference regression test exists and is bounded | NOT STARTED | —      | —            |
| E2  | Scaling fixtures (method count, call/reference fan-out)                  | NOT STARTED | —      | —            |
| E3  | Profile before optimizing; record digests/versions/time/memory           | NOT STARTED | —      | —            |
| E4  | Preserve effect identity, capture order, unrelated member facts          | NOT STARTED | —      | —            |

## Workstream F — Agent usability evaluation

Source: master §6 Phase 4 F, source A A7 (#3098), source B 4.1.

| #   | Item                                                                   | Status      | Commit | Verification |
| --- | ---------------------------------------------------------------------- | ----------- | ------ | ------------ |
| F1  | Evaluation set (binary, functions, Electron IPC, APK, capture)         | NOT STARTED | —      | —            |
| F2  | Score tool selection, argument validity, unnecessary calls, truncation | NOT STARTED | —      | —            |
| F3  | Compact results state scope, omissions, coverage, retrieval path       | NOT STARTED | —      | —            |

## Workstream G — Provider readiness and diagnostics

Source: master §6 Phase 3 G, source A A8, B3, B10, source B 2.8/3.6.

| #   | Item                                                                                                        | Status      | Commit | Verification |
| --- | ----------------------------------------------------------------------------------------------------------- | ----------- | ------ | ------------ |
| G1  | Separate installed / registered / protocol-compatible / target-supported / worker-ready / analysis-complete | NOT STARTED | —      | —            |
| G2  | `doctor` never says "fully ready" from schema-shape validation alone                                        | NOT STARTED | —      | —            |
| G3  | Unsupported profile fails naming profile + missing capability                                               | NOT STARTED | —      | —            |
| G4  | Diagnostics never launch/close/modify user-owned apps or DBs                                                | NOT STARTED | —      | —            |

## Workstream H — Resource limits and typed errors

Source: master §6 Phase 3 H, source A A10 (#6176, #5910), source B 5.3.

| #   | Item                                                                                                                         | Status      | Commit | Verification |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | ------------ |
| H1  | Inventory remaining hard-coded admission limits / ceilings                                                                   | NOT STARTED | —      | —            |
| H2  | Runtime enforcement matches advertised schema                                                                                | NOT STARTED | —      | —            |
| H3  | Distinct `invalid_request` / `resource_limit` / `provider_timeout` / `provider_unavailable` / `cancelled` / malformed output | NOT STARTED | —      | —            |
| H4  | Timeout / rejected budget never reported as "no findings"                                                                    | NOT STARTED | —      | —            |

## Workstream I — Source positions and selection errors

Source: master §6 Phase 2 I, source A A11 (#7132), source B 12.7.

| #   | Item                                                                     | Status                     | Commit      | Verification                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------ | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Reproduce out-of-range `generated_position` reported as `invalid_format` | DONE — VERIFIED reproduced | —           | Domain probe: `webSourceOffset` returned `undefined` and the service flattened that to `invalid_format` with no coordinate or bounds                                            |
| I2  | Standardize `out_of_range` vs `invalid_format` + real bounds             | DONE — VERIFIED            | `dc6533d16` | `out_of_range` on `["generated_position","line"]` / `["generated_position","column"]` with inclusive `minimum`/`maximum`; `invalid_format` kept only for a malformed coordinate |
| I3  | Negative / non-integer / malformed / out-of-range distinguished          | DONE — VERIFIED (domain)   | `dc6533d16` | `webSourcePositionOutcome` returns `invalid` for line < 1, column < 0, non-integer or unsafe integer; the public schema already refuses those with `invalid_request`            |
| I4  | CLI and MCP error structures agree                                       | DONE — VERIFIED            | `dc6533d16` | CLI probe on the rebuilt `dist/`: both coordinates report the same issue fields the MCP assertion checks; MCP test passes with the bounds and the incomplete observation        |

Workstream I notes:

- `webSourcePositionOutcome` is the single owner of line-terminator, line-count and column-bounds semantics; `webSourceOffset` (also used for source-map original-content lookups) derives from it, so there is one rule.
- A trailing terminator still starts a final empty line, so `"a\n"` retains lines 1–2 with `line: 3` refused as `out_of_range` (`minimum: 1`, `maximum: 2`).
- CLI verification needs a rebuilt `dist/` (`node scripts/run-turbo.mjs run artifacts:skills`): `scripts/rea.mjs` serves compiled output, and the pre-rebuild run still reported the old `invalid_format` shape. After rebuilding, `trace-web-source-location … 2 0` reports `["generated_position","line"]` 1–1 and `… 1 999` reports `["generated_position","column"]` 0–9, each with the retained-text message and the incomplete observation.
- `tests/acceptance/webSourceLocationCli.test.ts` still cannot pass on this host: its successful-trace call needs the owned codec, which fails closed with `capability_unavailable` because `native/windows/build/*` is missing. `tests/boundary/mcp/webSourceLocationMcp.test.ts` times out only against vitest's 30 s default (29.1 s of work) and passes with `--testTimeout=240000`.

## Workstream J — Windows boundaries

Source: master §6 Phase 3 J, source A A12 (#7121, #6305), source B 2.2/11.5.

| #   | Item                                                           | Status      | Commit | Verification |
| --- | -------------------------------------------------------------- | ----------- | ------ | ------------ |
| J1  | Unsupported DOS MZ/COM rejected early with precise explanation | NOT STARTED | —      | —            |
| J2  | Never close/modify user-owned Ghidra project                   | NOT STARTED | —      | —            |
| J3  | Windows lane verification status honestly marked               | NOT STARTED | —      | —            |
| J4  | Motorola 6809 evaluation documented (default: defer)           | NOT STARTED | —      | —            |

## Workstream K — Browser connect/launch parity

Source: master §6 Phase 3 K, source A A13 (#7167, PR #7188), source B 2.7/11.11.

| #   | Item                                                                                      | Status      | Commit | Verification |
| --- | ----------------------------------------------------------------------------------------- | ----------- | ------ | ------------ |
| K1  | Compare connect vs launch provider paths for first divergence                             | NOT STARTED | —      | —            |
| K2  | Distinguish unreachable endpoint / protocol mismatch / missing context / scenario failure | NOT STARTED | —      | —            |
| K3  | Connect mode never creates/destroys contexts it does not own                              | NOT STARTED | —      | —            |

## Workstream L — Process ownership and cleanup

Source: master §6 Phase 3 L, source A A14 (#7143), source B 9.x.

| #   | Item                                                                  | Status                         | Commit | Verification                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------- | ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Reproduce `/proc/<pid>/environ` EACCES ownership failure              | DONE — VERIFIED FIXED UPSTREAM | —      | `ProcessOwnership.part2.test.ts` covers `EACCES: permission denied, open '/proc/900/environ'`; `identity.test.ts` covers "records an unrelated same-UID Linux process whose environment is withheld". Both pass here                         |
| L2  | Independent identity facts sufficient for ownership                   | PARTIAL — INFERRED (source)    | —      | `LinuxProcessStatus.ts` derives the kernel restriction from the same stat-bracketed procfs read (Uid/Gid from `status`, root-owned `environ`); `ProcessOwnership.procIdentity.test.ts` asserts the `stat` call. Not re-derived on Linux here |
| L3  | Fail closed: never kill a process on unreadable metadata              | DONE — VERIFIED                | —      | `finalSweep.test.ts` (6) and `ProcessOwnership.test.ts` (`platform_binary_environment_withheld`) keep withheld rows unverified while related candidates still fail closed                                                                    |
| L4  | PID reuse / vanished process / permission error / cleanup retry tests | DONE — VERIFIED (coverage)     | —      | `identity.test.ts` 26 tests (6 skipped), `finalSweep.test.ts` 6, `part2.test.ts` 8 (1 skipped): 33 passed / 7 skipped on this host                                                                                                           |

## Workstream M — Node.js compatibility and package integrity

Source: master §6 Phase 5 M, source A B4, source B 2.4/2.5/13.x.

| #   | Item                                          | Status                            | Commit | Verification                                                                                                                                                        |
| --- | --------------------------------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Do not relax `engines` without lane evidence  | NOT STARTED                       | —      | —                                                                                                                                                                   |
| M2  | Packed tarball tested in a clean temp install | NOT STARTED                       | —      | —                                                                                                                                                                   |
| M3  | No test files in tarball                      | DONE — VERIFIED (prepack skipped) | —      | `npm pack --dry-run --json --ignore-scripts`: 2,584 files, 0 test files, 0 source maps; raw `pack` fails at prepack on this host's missing `native/windows/build/*` |
| M4  | Do not publish to npm                         | DONE                              | —      | Out of scope by prompt §12.7.                                                                                                                                       |

---

## Cross-cutting 1–13

| #   | Item                                                                    | Status      | Commit | Verification |
| --- | ----------------------------------------------------------------------- | ----------- | ------ | ------------ |
| X1  | Provenance & uncertainty labelling (observed/derived/heuristic/unknown) | NOT STARTED | —      | —            |
| X2  | CLI/MCP shared workflow equivalence tests                               | NOT STARTED | —      | —            |
| X3  | Provider capability profiles (OS × version × format × arch × operation) | NOT STARTED | —      | —            |
| X4  | Honest platform/format support matrix                                   | NOT STARTED | —      | —            |
| X5  | Reproducible report manifests / evidence export                         | NOT STARTED | —      | —            |
| X6  | Provider-version compatibility diagnostics                              | NOT STARTED | —      | —            |
| X7  | Cross-platform path & cleanup tests                                     | NOT STARTED | —      | —            |
| X8  | Documentation accuracy (docs:check, links, examples)                    | NOT STARTED | —      | —            |
| X9  | Contributor architecture map / lower first-contribution friction        | NOT STARTED | —      | —            |
| X10 | Emulation scope decision documented (default: do not build)             | NOT STARTED | —      | —            |
| X11 | Real-provider/client lanes separated from deterministic tests           | NOT STARTED | —      | —            |
| X12 | Task-specific setup/prerequisite guidance                               | NOT STARTED | —      | —            |
| X13 | Golden/characterization tests for public contracts                      | NOT STARTED | —      | —            |

---

## Golden / characterization snapshots (master §1.2)

| #   | Snapshot                                              | Status        | Path                                                                                                            |
| --- | ----------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| G-1 | Canonical MCP tool inventory (names + schema digests) | DONE-VERIFIED | `docs/better-rea/golden/mcp-catalog-digests.json` (+ `scripts/better-rea/snapshot-catalog-digests.mjs --check`) |
| G-2 | Representative CLI output                             | NOT STARTED   | —                                                                                                               |
| G-3 | Representative MCP tool results                       | NOT STARTED   | —                                                                                                               |
| G-4 | Error message categories                              | NOT STARTED   | —                                                                                                               |

---

## Commit log (work branch)

| Commit                   | Description                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| —                        | Baseline is `9593bc536`; no Better-REA commits yet.                                       |
| `45f2e6c66`              | `fix(javascript)`: resolve module-level `const` Electron options inside functions (#7227) |
| `3d48437b1`              | `docs(better-rea)`: measure the MCP `tools/list` catalog across output profiles           |
| `e42f4cbf9`              | `test(javascript)`: guard `defineProperty` descriptor overwrite order (#7219)             |
| `dc6533d16`              | `fix(web)`: report out-of-range `generated_position` bounds (#7132)                       |
| `19838a5ac`              | `test(web)`: assert `generated_position` bounds through MCP                               |
| `caff390de`              | `fix(contracts)`: traverse `contentSchema` and keep mixed-enum member types (#7123)       |
| `84ef9d24c`, `de1a2407b` | `docs(better-rea)`: record the workstream I bounds fix; tidy the B table                  |
| `1c0afcf90`              | `docs(better-rea)`: snapshot the canonical catalog identity (G-1)                         |
| `1ba831586`              | `docs(better-rea)`: record the baseline and final reports                                 |

### Delivery state

Verified with `git ls-remote --heads origin` and `gh repo view`:

| Item          | Value                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| Remote        | `https://github.com/kritagyadubey/better-rea` (public, not empty)                |
| `origin/main` | `1ba831586`                                                                      |
| Work branch   | `better-rea/main-work` at `1ba831586`, tracking `origin/better-rea/main-work`    |
| Baseline tag  | `baseline-pre-better-rea` pushed to `origin`                                     |
| Upstream      | `morluto/rea` untouched; its push URL is still `DISABLED`                        |
| npm           | Nothing published. `npm pack` was only ever run as `--dry-run --ignore-scripts`. |

The GitHub default branch is `better-rea/main-work` because it was pushed first;
`main` points at the same commit, so either name serves the same tree.

## Evidence ledger

| ID       | Source                                                                        | Defect / improvement                                                                                                                                        | Location                                                                                                                | Reproduction on current code                                                                                                                                                                                                                                                                                            | Root cause                                                                                                                                                                                         | Fix commit              | Test                                                                                                                                                                                                                        | Verification                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-01     | Source A A3 / issue #7227                                                     | Module-level `const webPreferences` reported dynamic when consumed inside a function                                                                        | `src/domain/javascript/electronStaticOptionObjects.ts`                                                                  | VERIFIED reproduced — `web_preferences_status: "dynamic"`                                                                                                                                                                                                                                                               | `semanticBindingAtRead` cannot order a read across a function boundary → `hasDefiniteInitializer: false` → `optionObjectCandidate` bails                                                           | `45f2e6c66`             | `electronStaticAnalysisOptions.test.ts` → "Electron options declared outside a function"                                                                                                                                    | `vitest run src/domain/javascript` → 6152 passed; 30 failures pre-existing and reproduced on baseline                                                                                                                                                                                                 |
| after A  | `node scripts/run-turbo.mjs run artifacts:skills`                             | PASSED — 3 tasks, 57 s; `dist/` regenerated because the catalog generator imports from `dist/`                                                              |
| after A  | `node scripts/better-rea/measure-mcp-catalog.mjs`                             | PASSED — 6 profile variants + 2 family sweeps; default frame 3,786,655 B, complete frame 4,383,879 B                                                        |
| after A  | `oxlint` + `oxfmt --check` on `scripts/better-rea/**` and `knip.json`         | PASSED — no warnings, formatting clean                                                                                                                      |
| after A  | `knip --cache`                                                                | FAILED — one pre-existing unused exported type `HexRecordRegionMetadata` (`src/domain/artifactFormatMetadata.ts:200`), untouched by this work               |
| after B1 | `node scripts/run-typescript.mjs --noEmit`                                    | PASSED — exit 0                                                                                                                                             |
| after B1 | `vitest run src/domain/javascript/electronWrappedCallPaths.test.ts`           | PASSED — 190 tests (184 before, +6)                                                                                                                         |
| after B1 | `node scripts/rea.mjs analyze-javascript-application <fixture> --format json` | BLOCKED — exit 1, `capability_unavailable`: missing `native/windows/build/rea-windows-x64.node`; the same 30 browser tests fail at baseline for this reason |
| E-02     | Source A A3 (same class)                                                      | Renderer load through a module-level window alias inside a function produced no `role_paths` entry                                                          | `src/domain/javascript/electronStaticRenderer.ts`                                                                       | VERIFIED — probe: baseline `role_paths=[]`, patched `role_paths=["https://alias.example.test"]`                                                                                                                                                                                                                         | Same unresolved binding read                                                                                                                                                                       | `45f2e6c66`             | `javascriptStaticAnalysisCalleeBoundary.test.ts` → "attributes a module-level window alias load inside a function"                                                                                                          | `vitest run .../javascriptStaticAnalysisCalleeBoundary.test.ts` → 64 passed                                                                                                                                                                                                                           |
| E-03     | Source A A2 / issue #7219                                                     | `Object.defineProperty` descriptor used the first `value` instead of the effective last `value`                                                             | `src/domain/javascript/javascriptSymbolicBindings.ts` (`#indexWriteSite`)                                               | VERIFIED FIXED UPSTREAM — the issue closed 2026-10-26, before the `9593bc536` baseline. HEAD reads the descriptor through `staticObjectPropertyReader`; a six-case probe through `analyzeJavaScriptStaticSource` returns the effective value in both duplicate orders, both spread orders and both computed-key orders. | The historical defect was a first-match `descriptor.properties.find(...)` scan; the current owner is last-wins with explicit uncertainty for accessors, dynamic keys and unknown spreads.          | Pre-existing (upstream) | `electronWrappedCallPaths.test.ts` → "defineProperty descriptor overwrite order" (6 cases, added here)                                                                                                                      | `vitest run src/domain/javascript/electronWrappedCallPaths.test.ts` → 190 passed                                                                                                                                                                                                                      |
| E-04     | Source A A11 / issue #7132                                                    | Out-of-range `generated_position` refused as `invalid_format` with no coordinate or bounds                                                                  | `src/domain/webSourcePosition.ts`, `src/application/WebSourceLocationService.ts`                                        | VERIFIED reproduced before the change: line past the retained text and column past the line end both produced `issues: [{ path: ["generated_position"], reason: "invalid_format" }]`                                                                                                                                    | The bounds were computed inside the offset helper but discarded as `undefined`, so the projection had no coordinate, minimum or maximum to report                                                  | `dc6533d16`             | `webSourcePosition.test.ts` → "reports the retained line count…" / "reports the selected line's UTF-16 length…"; `WebSourceLocationService.test.ts` → "reports retained-text bounds for an out-of-range generated position" | `vitest run src/domain/webSourcePosition.test.ts src/application/WebSourceLocationService.test.ts src/javascript/sourceMaps/TraceSourceMap.test.ts` → 59 passed; typecheck clean; MCP boundary test passed with a raised timeout; CLI probe on rebuilt `dist/` returned the new `out_of_range` bounds |
| E-05     | Source A A4 / issue #7123                                                     | Advertised input schemas skip `contentSchema` and drop the member types of a mixed enum containing `""`                                                     | `src/contracts/jsonSchemaKeywords.ts`, `src/contracts/inputSchemaPresentation.ts`, `src/contracts/compactJsonSchema.ts` | VERIFIED reproduced on HEAD: `presentInputJsonSchema` left `contentSchema: {const: ""}` intact and turned `{enum: ["", 1]}` into `{}`; the tuple `items` case was already widened                                                                                                                                       | `contentSchema` was missing from the shared `schemaChildren` keyword set; mixed enums only received `type: "string"` when every member was a string, so other mixes advertised an untyped property | `caff390de`             | `src/contracts/inputSchemaPresentation.test.ts` (4 cases: nested contentSchema, mixed-enum type matrix with Ajv, all-string regression, client-constraint walk)                                                             | `vitest run src/contracts` → 23 files/226 passed; `toolSchemaValidity` + `compactInputSchemaMcp` + `outputSchemaProfile` passed; default frame unchanged at 3,786,655 B                                                                                                                               |

## Verification command log

| When             | Command                                                                                                                                                          | Result                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseline         | `npm ci`                                                                                                                                                         | PASSED — 729 packages (esbuild postinstall flagged by npm `allowScripts`; `esbuild@0.28.2` verified loadable)                                         |
| baseline         | `npm run typecheck`                                                                                                                                              | PASSED — exit 0                                                                                                                                       |
| baseline         | `vitest run src/browser/ElectronFileScope.cleanup.test.ts src/browser/WebBundleAnalysisWorker.test.ts src/browser/WebBundleAnalysisWorkerReadCompletion.test.ts` | FAILED — 30 failures, **pre-existing** (needs built worker artifacts)                                                                                 |
| after E-01/E-02  | `node scripts/run-typescript.mjs --noEmit`                                                                                                                       | PASSED — exit 0                                                                                                                                       |
| after E-01/E-02  | `oxlint` + `oxfmt --check` on changed files                                                                                                                      | PASSED — warnings only, pre-existing in the touched file                                                                                              |
| after E-01/E-02  | `vitest run src/domain/javascript src/application/javascript src/domain/electron src/browser`                                                                    | 6152 passed, 12 skipped, 30 failed (same 30 pre-existing)                                                                                             |
| after E-03       | `vitest run src/domain/javascript/electronWrappedCallPaths.test.ts`                                                                                              | PASSED — 190 tests (184 before, +6)                                                                                                                   |
| after I1–I3      | `node scripts/run-typescript.mjs --noEmit`                                                                                                                       | PASSED — exit 0                                                                                                                                       |
| after I1–I3      | `vitest run src/domain/webSourcePosition.test.ts src/application/WebSourceLocationService.test.ts src/javascript/sourceMaps/TraceSourceMap.test.ts`              | PASSED — 59 tests (30 in the two touched files, +11)                                                                                                  |
| after I1–I3      | `oxlint` + `oxfmt --check` on changed files                                                                                                                      | PASSED — warnings only, pre-existing in the touched files                                                                                             |
| after I1–I3      | `vitest run tests/boundary/mcp/webSourceLocationMcp.test.ts`                                                                                                     | PASSED with `--testTimeout=240000` — 2 tests, 29.1 s of work (the default 30 s limit is too tight on this host)                                       |
| after I1–I3      | CLI probe: `node scripts/rea.mjs trace-web-source-location … 2 0 / 1 999 --json` after `artifacts:skills`                                                        | PASSED — `out_of_range` on `["generated_position","line"]` 1–1 and `["generated_position","column"]` 0–9 with the incomplete observation              |
| after I1–I3      | `vitest run tests/acceptance/webSourceLocationCli.test.ts`                                                                                                       | FAILED — `capability_unavailable` on its successful-trace call, **pre-existing** (verified with the change stashed: missing `native/windows/build/*`) |
| after C1         | `vitest run src/contracts`                                                                                                                                       | PASSED — 23 files, 226 tests (4 new)                                                                                                                  |
| after C1         | `vitest run tests/boundary/mcp/toolSchemaValidity.test.ts --testTimeout=240000`                                                                                  | PASSED — 16 tests                                                                                                                                     |
| after C1         | `node scripts/better-rea/measure-mcp-catalog.mjs --no-families`                                                                                                  | PASSED — 231 tools, 9,995 shared definitions, default frame 3,786,655 B and complete frame 4,383,879 B (unchanged)                                    |
| after G-1        | `node scripts/better-rea/snapshot-catalog-digests.mjs` then `--check`                                                                                            | PASSED — 231 tools, 6 profiles; a hand-edited digest is reported as `profiles.compact.full.combined_sha256` drift                                     |
| after G-1        | `knip --cache`                                                                                                                                                   | FAILED — only the pre-existing unused `HexRecordRegionMetadata`; the new script is registered as an entry                                             |
| after L1–L4      | `vitest run src/process/ProcessOwnership.identity.test.ts src/process/ProcessOwnership.finalSweep.test.ts src/process/ProcessOwnership.part2.test.ts`            | PASSED — 33 passed, 7 skipped (40)                                                                                                                    |
| after M3         | `npm pack --dry-run --json --ignore-scripts`                                                                                                                     | PASSED — 2,584 files / 11.2 MB, 0 test files, 0 source maps; plain `pack` is blocked by the missing native artifact                                   |
| after final docs | `node scripts/run-turbo.mjs run typecheck lint`                                                                                                                  | PASSED — 2 of 2 tasks, exit 0 (2m28s)                                                                                                                 |
| after final docs | `node node_modules/oxfmt/bin/oxfmt --check .`                                                                                                                    | PASSED — 6,242 files already formatted                                                                                                                |
| after final docs | `node scripts/check-doc-facts.mjs`                                                                                                                               | PASSED — exit 0                                                                                                                                       |
