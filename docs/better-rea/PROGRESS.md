# Better-REA — Progress Ledger

> Continuously updated. Re-read at the start of every phase.

**Project:** Better-REA — Better Reverse Engineer Anything
**Upstream (read-only):** https://github.com/morluto/rea @ `9593bc536b0549f0997e6b7922904f8fd1e91021` (2026-10-28, `rea-agents@6.8.0`, 593 commits past tag `rea-agents-6.8.0`)
**Destination:** https://github.com/kritagyadubey/better-rea (origin)
**Work branch:** `better-rea/main-work`
**Baseline tag:** `baseline-pre-better-rea`

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

| #   | Item                                                                    | Status        | Evidence / notes                                                                        |
| --- | ----------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| 0.1 | Read Source A `REA_final_actionable_improvement_backlog.txt` end to end | DONE          | 904 lines read in full. Found at `C:\Users\krita\Downloads\`.                           |
| 0.2 | Read Source B `REA_WEAKNESSES_AND_IMPROVEMENTS.txt` end to end          | DONE          | 1341 lines read in full. Found at `C:\Users\krita\OneDrive\Documents\Default Project\`. |
| 0.3 | Merge both into one de-duplicated checklist                             | DONE          | This file (workstreams A–M + cross-cutting 1–13).                                       |
| 0.4 | Licence check before copying                                            | DONE-VERIFIED | `gh repo view morluto/rea` → MIT. LICENSE preserved in tree.                            |
| 0.5 | Clone with upstream history, remotes separated                          | DONE-VERIFIED | `git remote -v`: origin=better-rea, upstream=rea, `upstream` push = `DISABLED`.         |
| 0.6 | Baseline tag created                                                    | DONE-VERIFIED | `git tag -a baseline-pre-better-rea`.                                                   |
| 0.7 | Baseline verification recorded                                          | IN PROGRESS   | See `docs/better-rea/baseline-report.md`.                                               |

---

## Workstream A — MCP catalog size / agent context cost

Source: master §6 Phase 4 A, source A A1/A9/A7, source B 4.1/4.2/4.3/4.6/8.4, issues #7155, discussion #3098.

| #   | Item                                                                           | Status                       | Commit       | Verification                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------ | ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Measure serialized `tools/list` bytes, input vs output schema share            | DONE-VERIFIED                | see A-commit | `node scripts/better-rea/measure-mcp-catalog.mjs` → default 3,786,655 B; output schemas 3,469,986 B (91.6%), input schemas 127,195 B (3.4%)                                                                                                |
| A2  | Measure real token counts for representative tokenizers                        | DEFERRED                     | —            | Two independent **estimates** recorded instead (`/4` → 946,664; structural → 432,565 for the default frame). No tokenizer ran, so no measured count is claimed.                                                                            |
| A3  | Profile largest input/output schemas for repeated structure                    | DONE-VERIFIED                | see A-commit | 231 tools already emit 9,995 shared `$defs`; **0** unreachable definitions; intra-schema refactoring ceiling 23,415 B = 0.7% of output bytes. Largest tool = `inspect_analysis_view`, 537,146 B output schema, 14.6% of the default frame. |
| A4  | Safe schema deduplication / shared contract construction                       | DEFERRED                     | —            | Measured ceiling is 0.7%: the emitter already deduplicates, so there is no material win to justify a schema-emitter change. Revisit only if a large unreachable-`$defs` regression appears.                                                |
| A5  | Task-family presets (native, JS/Electron, browser/network, artifacts, session) | DONE-VERIFIED (pre-existing) | —            | Already shipped: `REA_MCP_TOOL_FAMILIES`, 18 families in `src/contracts/toolFamilies.ts`, `rea setup --tool-families`. Measured per-family frames; largest single family is `direct` at 456,248 B (12.0% of the default frame).            |
| A6  | Preserve FULL canonical inventory; no tool removed; validation intact          | DONE-VERIFIED                | —            | 231 tools advertised in every profile; no tool list changed. `mcp-catalog:check` and the contract tests are untouched.                                                                                                                     |
| A7  | Before/after report with real measurements                                     | DONE-VERIFIED                | see A-commit | `docs/better-rea/benchmarks/mcp-catalog.md` + `.json`.                                                                                                                                                                                     |

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

| #   | Item                                                                       | Status        | Commit      | Verification                                                                                                                                                        |
| --- | -------------------------------------------------------------------------- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Reproduce #7219 `Object.defineProperty` first-vs-effective `value`         | NOT STARTED   | —           | —                                                                                                                                                                   |
| B2  | Respect JS overwrite order for duplicate descriptor keys (both orders)     | NOT STARTED   | —           | —                                                                                                                                                                   |
| B3  | Literal spreads in both orders                                             | NOT STARTED   | —           | —                                                                                                                                                                   |
| B4  | Computed `"value"` keys / dynamic spreads / getters keep uncertainty       | NOT STARTED   | —           | —                                                                                                                                                                   |
| B5  | CLI and MCP produce equivalent candidate paths + uncertainty               | NOT STARTED   | —           | —                                                                                                                                                                   |
| B6  | Reproduce #7227 module-level `webPreferences` seen as dynamic in functions | DONE-VERIFIED | —           | Probe on `analyzeJavaScriptStaticSource`: `web_preferences_status: "dynamic"`, `web_preferences: []`                                                                |
| B7  | Resolve provably-stable module-level constants across function boundaries  | DONE-VERIFIED | `45f2e6c66` | `semanticConstValueAtRead` in `javascriptSemanticMutationInitializers.ts`                                                                                           |
| B8  | Whole-options object form + `app.whenReady().then(...)` callback           | DONE-VERIFIED | `45f2e6c66` | Tests "resolves a module-level immutable preferences object inside an app.whenReady() callback" + "resolves a module-level whole-options object through a function" |
| B9  | Mutation/escape/export/computed-update stay conservative                   | DONE-VERIFIED | `45f2e6c66` | `it.each` "keeps a module-level preferences object unknown after ..." (3 cases) + "does not resolve a const read before its declaration in the same function"       |
| B10 | JS/Electron semantic regression corpus consolidated                        | PARTIAL       | `45f2e6c66` | Renderer receiver-chain case added; #7219 corpus still open                                                                                                         |

## Workstream C — Schema / handler / CLI / MCP contract conformance

Source: master §6 Phase 2 C, source A A4 (#7123), B2, source B 4.x/5.x.

| #   | Item                                                                       | Status      | Commit | Verification |
| --- | -------------------------------------------------------------------------- | ----------- | ------ | ------------ |
| C1  | Reproduce #7123 `contentSchema` / tuple `items` / mixed enum normalization | NOT STARTED | —      | —            |
| C2  | Contract-conformance suite derived from canonical definitions              | NOT STARTED | —      | —            |
| C3  | Every advertised enum value accepted; invalid combos rejected early        | NOT STARTED | —      | —            |
| C4  | `inspect_analysis_view` selector schema vs runtime parity                  | NOT STARTED | —      | —            |
| C5  | Setup/doctor client-ID registry vs parser parity                           | NOT STARTED | —      | —            |
| C6  | CLI and MCP accept/reject equivalent logical requests                      | NOT STARTED | —      | —            |

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

| #   | Item                                                                     | Status      | Commit | Verification |
| --- | ------------------------------------------------------------------------ | ----------- | ------ | ------------ |
| I1  | Reproduce out-of-range `generated_position` reported as `invalid_format` | NOT STARTED | —      | —            |
| I2  | Standardize `out_of_range` vs `invalid_format` + real bounds             | NOT STARTED | —      | —            |
| I3  | Negative / non-integer / malformed / out-of-range distinguished          | NOT STARTED | —      | —            |
| I4  | CLI and MCP error structures agree                                       | NOT STARTED | —      | —            |

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

| #   | Item                                                                  | Status      | Commit | Verification |
| --- | --------------------------------------------------------------------- | ----------- | ------ | ------------ |
| L1  | Reproduce `/proc/<pid>/environ` EACCES ownership failure              | NOT STARTED | —      | —            |
| L2  | Independent identity facts sufficient for ownership                   | NOT STARTED | —      | —            |
| L3  | Fail closed: never kill a process on unreadable metadata              | NOT STARTED | —      | —            |
| L4  | PID reuse / vanished process / permission error / cleanup retry tests | NOT STARTED | —      | —            |

## Workstream M — Node.js compatibility and package integrity

Source: master §6 Phase 5 M, source A B4, source B 2.4/2.5/13.x.

| #   | Item                                          | Status      | Commit | Verification                  |
| --- | --------------------------------------------- | ----------- | ------ | ----------------------------- |
| M1  | Do not relax `engines` without lane evidence  | NOT STARTED | —      | —                             |
| M2  | Packed tarball tested in a clean temp install | NOT STARTED | —      | —                             |
| M3  | No test files in tarball                      | NOT STARTED | —      | —                             |
| M4  | Do not publish to npm                         | DONE        | —      | Out of scope by prompt §12.7. |

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

| #   | Snapshot                                              | Status      | Path |
| --- | ----------------------------------------------------- | ----------- | ---- |
| G-1 | Canonical MCP tool inventory (names + schema digests) | NOT STARTED | —    |
| G-2 | Representative CLI output                             | NOT STARTED | —    |
| G-3 | Representative MCP tool results                       | NOT STARTED | —    |
| G-4 | Error message categories                              | NOT STARTED | —    |

---

## Commit log (work branch)

| Commit      | Description                                                                               |
| ----------- | ----------------------------------------------------------------------------------------- |
| —           | Baseline is `9593bc536`; no Better-REA commits yet.                                       |
| `45f2e6c66` | `fix(javascript)`: resolve module-level `const` Electron options inside functions (#7227) |

## Evidence ledger

| ID   | Source                    | Defect / improvement                                                                               | Location                                                     | Reproduction on current code                                                                                                                                                                                | Root cause                                                                                                                               | Fix commit  | Test                                                                                                               | Verification                                                                                          |
| ---- | ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| E-01 | Source A A3 / issue #7227 | Module-level `const webPreferences` reported dynamic when consumed inside a function               | `src/domain/javascript/electronStaticOptionObjects.ts`       | VERIFIED reproduced — `web_preferences_status: "dynamic"`                                                                                                                                                   | `semanticBindingAtRead` cannot order a read across a function boundary → `hasDefiniteInitializer: false` → `optionObjectCandidate` bails | `45f2e6c66` | `electronStaticAnalysisOptions.test.ts` → "Electron options declared outside a function"                           | `vitest run src/domain/javascript` → 6152 passed; 30 failures pre-existing and reproduced on baseline |
| E-02 | Source A A3 (same class)  | Renderer load through a module-level window alias inside a function produced no `role_paths` entry | `src/domain/javascript/electronStaticRenderer.ts`            | VERIFIED — probe: baseline `role_paths=[]`, patched `role_paths=["https://alias.example.test"]`                                                                                                             | Same unresolved binding read                                                                                                             | `45f2e6c66` | `javascriptStaticAnalysisCalleeBoundary.test.ts` → "attributes a module-level window alias load inside a function" | `vitest run .../javascriptStaticAnalysisCalleeBoundary.test.ts` → 64 passed                           |
| E-03 | Source A A2 / issue #7219 | `Object.defineProperty` descriptor duplicate `value` keys                                          | `src/domain/javascript/javascriptCommonJsExportReceivers.ts` | PARTIAL — `staticObjectProperty` already takes the last `value`; the raw syntactic IPC scan reports every `ipcRenderer.send` call site regardless of reachability, so a reachable-path conclusion is needed | Not yet established                                                                                                                      | —           | —                                                                                                                  | —                                                                                                     |

## Verification command log

| When            | Command                                                                                                                                                          | Result                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| baseline        | `npm ci`                                                                                                                                                         | PASSED — 729 packages (esbuild postinstall flagged by npm `allowScripts`; `esbuild@0.28.2` verified loadable) |
| baseline        | `npm run typecheck`                                                                                                                                              | PASSED — exit 0                                                                                               |
| baseline        | `vitest run src/browser/ElectronFileScope.cleanup.test.ts src/browser/WebBundleAnalysisWorker.test.ts src/browser/WebBundleAnalysisWorkerReadCompletion.test.ts` | FAILED — 30 failures, **pre-existing** (needs built worker artifacts)                                         |
| after E-01/E-02 | `node scripts/run-typescript.mjs --noEmit`                                                                                                                       | PASSED — exit 0                                                                                               |
| after E-01/E-02 | `oxlint` + `oxfmt --check` on changed files                                                                                                                      | PASSED — warnings only, pre-existing in the touched file                                                      |
| after E-01/E-02 | `vitest run src/domain/javascript src/application/javascript src/domain/electron src/browser`                                                                    | 6152 passed, 12 skipped, 30 failed (same 30 pre-existing)                                                     |
