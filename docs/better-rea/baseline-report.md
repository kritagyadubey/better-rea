# Better-REA — baseline report

Recorded before the first change, at tag `baseline-pre-better-rea`
(`9593bc536b0549f0997e6b7922904f8fd1e91021`). This file is the reference point for
"did this change break anything": a failure listed here is pre-existing unless a
later entry in `PROGRESS.md` says otherwise.

Labels: **VERIFIED** = the named command ran here and produced this result.
**INFERRED** = reasoned from source only.

## 1. Provenance

| Item         | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Upstream     | `https://github.com/morluto/rea` (read-only, push disabled)                  |
| Commit       | `9593bc536b0549f0997e6b7922904f8fd1e91021` (2026-10-28)                      |
| Version      | `rea-agents@6.8.0`, 593 commits past tag `rea-agents-6.8.0`                  |
| Licence      | MIT (`LICENSE` preserved in tree) — VERIFIED with `gh repo view morluto/rea` |
| Baseline tag | `baseline-pre-better-rea` (annotated)                                        |
| Install      | `npm ci` — 729 packages, no install failures                                 |
| Toolchain    | Node.js v24.22.1 (`.nvmrc`), npm 11.x, Windows 11 x64                        |

## 2. Static baseline

| Check                                           | Result | Notes                                                             |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `node scripts/run-typescript.mjs --noEmit`      | PASSED | exit 0 on the untouched tree                                      |
| `node scripts/run-turbo.mjs run typecheck lint` | PASSED | exit 0; `oxlint` reports warnings only, as `npm run lint` expects |
| `node node_modules/oxfmt/bin/oxfmt --check .`   | PASSED | 6,242 files                                                       |
| `node scripts/check-doc-facts.mjs`              | PASSED | exit 0                                                            |
| `node node_modules/knip/bin/knip.js --cache`    | FAILED | one unused type: `HexRecordRegionMetadata` (pre-existing)         |

## 3. Test baseline and known failures

`vitest run src/domain/javascript` on the untouched tree: **6,152 passed, 12
skipped, 30 failed**. The 30 failures are all in:

- `src/browser/ElectronFileScope.cleanup.test.ts`
- `src/browser/WebBundleAnalysisWorker.test.ts`
- `src/browser/WebBundleAnalysisWorkerReadCompletion.test.ts`

The cause is environmental, not logical: `native/windows/build/manifest.json` and
`native/windows/build/rea-windows-x64.node` are absent, so every workflow that
loads the Windows native controls fails closed with `capability_unavailable`.
The same 30 failures reproduce with all later changes stashed, so they are
baseline behaviour on this host.

Two more pre-existing failures were separated out because they are easy to
misattribute to a change:

| File                                              | Baseline behaviour                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tests/acceptance/webSourceLocationCli.test.ts`   | the successful-trace call needs the owned source-map codec, which fails closed for the same missing native files |
| `tests/boundary/mcp/webSourceLocationMcp.test.ts` | 29.1 s of work against vitest's default 30 s timeout on this host; passes with `--testTimeout=240000`            |

## 4. What this baseline cannot establish

- No Ghidra, IDA, JEB, Apktool, Frida, ADB, Chromium, Java or Android SDK is
  installed. Provider lanes and browser capture are **NOT RUN**, at baseline and
  after this work.
- `rea setup` was not executed: it would install Hopper, which the task forbids.
- `npm pack` (without `--ignore-scripts`) cannot complete: its prepack step needs
  the same missing Windows native artifact.
- No tokenizer ran on the catalog; all token figures are estimates.

## 5. Reproduce

```bash
git switch --detach baseline-pre-better-rea
npm ci
node scripts/run-typescript.mjs --noEmit
node node_modules/vitest/vitest.mjs run src/domain/javascript
```
