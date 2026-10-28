# Better-REA — handoff

Two copy-paste prompts live here:

1. [For the next AI coder](#prompt-for-the-next-ai-coder) — everything it needs to
   continue without re-discovering the repo.
2. [For the owner](#prompt-for-the-owner) — a short prompt you paste when you
   want a fresh session to pick up where the last one stopped.

Keep this file current. When a prompt below goes stale, that is a bug in the
record, not a detail to remember.

---

## Prompt for the next AI coder

```text
You are continuing work on Better-REA, a hardened fork of REA.

REPOSITORY
- Local: C:\Users\krita\Downloads\better-rea (Windows 11 x64, PowerShell).
- origin   = https://github.com/kritagyadubey/better-rea (push allowed).
- upstream = https://github.com/morluto/rea (READ ONLY; its push URL is DISABLED).
  Never push there, never open PRs there, never force-push anywhere.
- Baseline tag: baseline-pre-better-rea = 9593bc536b0549f0997e6b7922904f8fd1e91021.
- Work branch: better-rea/main-work. main and better-rea/main-work point at the
  same commit; GitHub's default branch is better-rea/main-work.
- Nothing is published to npm. Do not publish.

READ FIRST, IN THIS ORDER
1. docs/better-rea/PROGRESS.md — live ledger: every item, status, evidence row,
   commit log, verification log, delivery state. Update it as you work; it is the
   single source of truth.
2. docs/better-rea/FINAL_REPORT.md — what changed and how each claim was checked.
3. docs/better-rea/baseline-report.md — the failures that predate the fork. If a
   test fails, check this before blaming your change.
4. AGENTS.md and CONTRIBUTING.md — repo rules. They are binding.

HARD CONSTRAINTS (do not break these)
- Public contract freeze: MCP tool names, tool schemas, CLI flags, package name
  (rea-agents), and Evidence field names are frozen. Additive changes only.
- Never weaken, skip or delete a test. Never loosen a type. Never delete a tool.
- One logical change per commit, Conventional Commit subjects.
- Windows native artifacts are missing, so some checks cannot pass here:
  native/windows/build/manifest.json and rea-windows-x64.node. That causes 30
  pre-existing failures in src/browser/ElectronFileScope.cleanup.test.ts,
  src/browser/WebBundleAnalysisWorker.test.ts and
  src/browser/WebBundleAnalysisWorkerReadCompletion.test.ts. They fail on the
  baseline too; do not "fix" them by skipping.
- No Ghidra, IDA, JEB, Apktool, Frida, ADB, Chromium, Java or Android SDK on this
  host. Do not install them. Do not run `rea setup` (it installs Hopper).
- README.md and the 22 files in docs/readme/ must keep an identical link-target
  multiset and identical bash examples; docs/check will fail otherwise. Run
  `node scripts/check-doc-facts.mjs` after touching any README.
- Label every claim VERIFIED (you ran it), INFERRED (source only), UNVERIFIED, or
  NOT RUN. Never report a check you did not run.

WHAT IS ALREADY DONE (all pushed)
- 45f2e6c66 fix(javascript): module-level const Electron options resolved inside
  functions (#7227), 6 new tests.
- e42f4cbf9 test(javascript): defineProperty descriptor overwrite order (#7219),
  6 cases; that file now has 190 tests.
- dc6533d16 fix(web): out-of-range generated_position reported as out_of_range
  with inclusive bounds; webSourcePositionOutcome owns the bounds (#7132).
- 19838a5ac test(web): the same bounds asserted through the MCP boundary.
- caff390de fix(contracts): contentSchema traversal and mixed-enum member types
  (#7123); src/contracts/inputSchemaPresentation.test.ts.
- 1c0afcf90 docs: G-1 catalog identity snapshot (231 names, 6 profile digests)
  plus scripts/better-rea/snapshot-catalog-digests.mjs --check.
- 3d48437b1 docs: measured the real tools/list cost across all six profiles;
  harness in scripts/better-rea/measure-mcp-catalog.mjs, report in
  docs/better-rea/benchmarks/mcp-catalog.md.
- 1ba831586 docs: baseline report + final report.
- 454f22d73, 6a0b83345 docs: ledger close-out, README rewritten as Better-REA
  (with a four-link Better-REA footer added to each translated README).

Verified on this host: typecheck, turbo typecheck+lint, oxfmt --check, doc facts,
src/contracts (226), web position suites (59), MCP schema suites (34), process
ownership (33 passed, 7 skipped), MCP web-source-location boundary (needs
--testTimeout=240000), tarball file list via `npm pack --dry-run --json
--ignore-scripts` (2,584 files, 0 tests). knip fails only on the pre-existing
unused type HexRecordRegionMetadata.

WHAT REMAINS, IN PRIORITY ORDER
1. BLOCKED on this host but highest value: Windows native lane. Without
   rea-windows-x64.node the browser worker tests, tests/acceptance/
   webSourceLocationCli.test.ts (successful trace) and `npm pack` prepack cannot
   run. If the artifact is built, run the 30 failing tests first and record the
   result.
2. Workstream D (Ghidra truncated bodies) and K (browser connect/launch parity)
   are BLOCKED: no Ghidra, no Chromium. Workstream E (profiling) needs a provider
   lane. Do not fake these; mark NOT RUN with the reason.
3. Workstream H: only H3 is partial (out_of_range vs invalid_format). An audit of
   the remaining hard-coded admission limits and the
   invalid_request/resource_limit/provider_timeout/provider_unavailable/cancelled
   taxonomy is a pure source task and can be done without providers. Start there
   if you want an unblocked, high-value item.
4. M1/M2: engines are unchanged and verified. M2 (clean temp install of the
   packed tarball) is blocked by prepack on this host.
5. Cross-cutting X1-X13 and golden G-2..G-4 are mostly NOT STARTED; each row in
   PROGRESS.md says what would unblock it.

HOW TO WORK (this host)
- npm is not directly invocable (execution policy). Call node directly:
  node node_modules/vitest/vitest.mjs run <paths>
  node scripts/run-typescript.mjs --noEmit
  node scripts/run-turbo.mjs run typecheck lint
  node node_modules/oxfmt/bin/oxfmt --check .
  node node_modules/knip/bin/knip.js --cache
  node scripts/check-doc-facts.mjs
  node scripts/better-rea/check-doc-tables.mjs
- CLI checks need a rebuilt dist/: node scripts/run-turbo.mjs run artifacts:skills
  before running node scripts/rea.mjs ...
- git commit may exit 1 because the hook writes to stderr; verify with
  git log --oneline -1. Write commit messages to a file and use git commit -F.
- PowerShell mangles backticks and here-docs; write scripts with the file tools.

DEFINITION OF DONE FOR ANY CHANGE
- The change is minimal and at the owning boundary; superseded code is removed.
- New behaviour has a regression test that fails without the fix.
- Typecheck, lint, format, doc facts and the relevant test files pass; anything
  that cannot run is reported as NOT RUN with the reason.
- PROGRESS.md has the new status row, the evidence, the commit, and a
  verification-log line. FINAL_REPORT.md is updated if the claim set changed.
- Committed and pushed to origin/better-rea/main-work (and main), never upstream.
```

---

## Prompt for the owner

Paste this when you start a new session and want it to continue without losing
context. Replace the last line with what you want next.

```text
Continue Better-REA in C:\Users\krita\Downloads\better-rea.

Start by reading docs/better-rea/HANDOFF.md, then docs/better-rea/PROGRESS.md.
Work on branch better-rea/main-work, push only to origin
(kritagyadubey/better-rea), never to upstream (morluto/rea), and never publish to
npm. Keep the public contract frozen and update PROGRESS.md at every step with
VERIFIED / INFERRED / UNVERIFIED / NOT RUN labels.

Next task: <say what you want, for example "finish workstream H", "build the
Windows native artifact and unblock the browser tests", or "review the README">
```

If the ledger and the report disagree, the ledger wins and the report is the
thing to fix.
