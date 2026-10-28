<div align="center">

**English** · [简体中文](docs/readme/README_zh.md) · [繁體中文](docs/readme/README_zh-TW.md) · [日本語](docs/readme/README_ja.md) · [한국어](docs/readme/README_ko.md) · [Türkçe](docs/readme/README_tr.md) · [Русский](docs/readme/README_ru.md) · [Tiếng Việt](docs/readme/README_vi.md) · [ไทย](docs/readme/README_th.md) · [Deutsch](docs/readme/README_de.md) · [Español](docs/readme/README_es.md) · [Français](docs/readme/README_fr.md) · [Українська](docs/readme/README_uk.md) · [Polski](docs/readme/README_pl.md) · [Português (Brasil)](docs/readme/README_pt-BR.md) · [العربية](docs/readme/README_ar.md) · [فارسی](docs/readme/README_fa.md) · [Bahasa Indonesia](docs/readme/README_id.md) · [Italiano](docs/readme/README_it.md)
· [Ελληνικά](docs/readme/README_el.md) · [മലയാളം](docs/readme/README_ml.md) · [Roman Urdu](docs/readme/README_ur-Latn.md) · [Română](docs/readme/README_ro.md)

<br />

<sub><strong>◆ BETTER-REA ◆</strong> · a hardened fork of REA · evidence over guesses</sub>

# Better-REA

### A hardened fork of REA: same MCP tools, fewer dead ends.

**Understand a feature down to the binary — and trust the answer, because every
claim carries its evidence and its gaps.**

[![npm version](https://img.shields.io/npm/v/rea-agents?style=flat-square&color=cb3837)](https://www.npmjs.com/package/rea-agents)
[![MCP tool catalog](https://img.shields.io/badge/MCP-tool_catalog-5c4ee5?style=flat-square)](docs/mcp-contracts.md#generated-catalog)
[![Node.js requirements](https://img.shields.io/badge/Node.js-requirements-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#what-you-can-analyze)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)

[Quick start](#quick-start) · [What Better-REA is](#what-better-rea-is) · [Why it's better](#why-its-better) · [How it works](#how-it-works) · [What you can analyze](#what-you-can-analyze) · [Showcases](#showcases) · [Build RL environments](#build-rl-environments) · [FAQ](#faq) · [Documentation](#documentation)

<code>npx rea-agents setup</code>

</div>

> [!NOTE]
> **Better-REA is a fork of [REA](https://github.com/morluto/rea) by morluto.** The
> upstream project remains the source of the shared tools, guides and packaged
> skill: its [project website](https://rea.tools/) is still the full product story,
> and its [issue tracker](https://github.com/morluto/rea/issues) is still the place
> for problems in the shared workflows. This file covers what the fork keeps, what
> it fixes, and why that is worth a separate repository.

<div align="center">

<br />

<img src="docs/assets/rea-hopper-analysis.png" alt="REA launching its analysis bridge inside Hopper while inspecting a native binary" width="1200" />

<br />

</div>

---

## What Better-REA is

**Better-REA is a hardened fork of REA.** It is the same product on the same
contract — every MCP tool name, every advertised schema, every CLI flag and the
`rea-agents` package name are upstream's — with a review pass applied on top. The
review began at `9593bc536` (`rea-agents@6.8.0`) under one rule: change nothing
that another tool already depends on. No tool was renamed, removed or re-scoped,
no CLI flag changed, no Evidence field moved, and no advertised schema byte changed
for REA's own 231 contracts.

- **Fixed, not re-described.** Defects this host could reproduce now behave
  correctly, and each fix carries a regression test that fails without it.
- **Pinned, not hoped-for.** The advertised catalog is snapshotted per profile, so
  a schema that silently changes shape fails a check instead of surprising a user.
- **Measured, not assumed.** What an agent pays for `tools/list` is recorded per
  profile with a reproducible harness.
- **Honest about edges.** Anything that needed a provider, a platform or an install
  this host does not have is recorded as NOT RUN, not reported as passing.

It is deliberately small: where an upstream issue was already fixed, the fork adds
coverage or says so instead of re-implementing it, and where a change would alter
what agents are advertised, it is measured and written down as a recommendation
rather than shipped.

## Why it's better

Three properties, in the order they matter to someone debugging real software:

1. **A wrong answer becomes a bounded answer.** A generated position past the end
   of the retained script text used to return `invalid_format` with no coordinate
   and no limits. It now returns `out_of_range` with inclusive `minimum`/`maximum`
   on the offending component and keeps the incomplete observation, so the caller
   can see exactly what was known.
2. **The contract cannot drift silently.** 231 tool names and six profile digests
   are pinned in `docs/better-rea/golden/mcp-catalog-digests.json`, and `--check`
   names the profile that moved.
3. **The cost is a number, not a feeling.** The default `tools/list` frame is
   measured at 3.79 MB across six profiles, 91.6% of it output schemas — which is
   why both schema profiles exist and why choosing one is documented instead of
   guessed.

### What changed, item by item

| Area               | What was wrong                                                                                                          | What the fork does now                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron analysis  | `const webPreferences` declared outside a function was reported as `"dynamic"` when read inside it (#7227)              | Resolves the module-level value at the read site; the option object is classified again instead of being written off                                                      |
| Source locations   | A position past the retained script text was rejected as `invalid_format` with no coordinate and no bounds (#7132)      | Returns `out_of_range` on `["generated_position","line"]` or `\["generated_position","column"\]` with inclusive `minimum`/`maximum`, and keeps the incomplete observation |
| Advertised schemas | Draft 2020-12 `contentSchema` was invisible to the schema walk, and a mixed enum like `["", 1]` advertised `{}` (#7123) | `contentSchema` is traversed like `items`; mixed enums keep every member type (`{"type":["string","number"]}`)                                                            |
| Catalog identity   | Nothing stopped a schema from silently changing shape between commits                                                   | `docs/better-rea/golden/mcp-catalog-digests.json` pins 231 tool names and six profile digests; `--check` names the drifting profile                                       |
| `defineProperty`   | Descriptor overwrite order had no regression coverage (#7219)                                                           | Six descriptor orders are pinned, including literal spreads and uncertainty cases                                                                                         |
| Catalog cost       | Nobody had measured what an agent actually pays for `tools/list`                                                        | Measured across all six profiles: 3.79 MB default, 91.6% of it output schemas; recorded with a reproducible harness                                                       |

The work is deliberately conservative: where a reported issue was already fixed
upstream, the fork adds coverage or says so instead of re-implementing it. Where
a change would have altered the public advertisement — the default output schema
profile, for instance — it is measured and documented as a recommendation rather
than shipped.

Everything above is reproducible: `docs/better-rea/FINAL_REPORT.md` lists each
commit with the command that verified it, `docs/better-rea/PROGRESS.md` tracks
every item and its honest status, and `docs/better-rea/baseline-report.md`
records the failures that already existed before the first change. The links are
in [Documentation](#documentation).

## Quick start

On Linux, Ghidra, JADX, firmware tool launches and static JavaScript/Electron
analysis require a procps-compatible `ps` on REA's `PATH` for process ownership
checks. Recovery steps are in `docs/installation.md` under
"Linux owned-process prerequisite".

### Set up your agent

With Node.js and npm installed, run:

```bash
npx rea-agents setup
```

Choose your agents, review the proposed changes, and approve them. Setup adds
REA's MCP server and matching workflow instructions, with backups of existing
configuration. Restart your agent afterward. Setup records the selected runtime and REA
entry script directly. If acquired through a package runner, keep its cache entry
available. Run package acquisition from a trusted directory outside the target
project. Installation and recovery details are in the setup guide below.

Setup supports Claude Code, Codex, Cursor, Gemini CLI, Grok Build and
[other agents](docs/installation.md#supported-agents). See
[installation and setup](docs/installation.md) for provider configuration and
manual MCP registration and Claude Code/Codex plugin installation, including a
[skill-only install](docs/installation.md#skill-only-installation). The same guide
covers the [MCP registry](docs/installation.md#mcp-registry) entry, and
[launcher paths and troubleshooting](docs/installation.md#launcher-paths-and-troubleshooting)
when a registered entry stops resolving.

MCP uses compact input schemas by default to reduce context overhead. Set
`REA_MCP_INPUT_SCHEMA_PROFILE=full` in your MCP registration when you need the
complete advertised field guidance and nested validation details. Both profiles
keep the full tool set and canonical server validation. See
"Compact input schema profile" in the
[MCP contracts guide](docs/mcp-contracts.md), which also documents the
generated catalog.

Complete output schemas are advertised by default. If your client caps the
complete `tools/list` frame, set `REA_MCP_OUTPUT_SCHEMA_PROFILE=compact` to
bound each advertised output schema, or `off` to omit output schemas entirely.
Both settings keep canonical server-side validation and complete structured
results. See "Output schemas" in the MCP contracts guide. The fork's
`docs/better-rea/benchmarks/mcp-catalog.md` report shows what each profile costs
on this tree.

### Ask your agent

```text
Understand how search works in the Notes app, show me the evidence, and build a
similar feature for my project.
```

Replace Notes with your target app and the feature you want to understand.

### Use the terminal

Inspect an extracted JavaScript/Electron app directory or ASAR:

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

The result includes modules, imports, Electron boundaries and their evidence.
Replace the path with your target, such as `"D:/apps/example"` on Windows.

To install the `rea` command for regular use:

```bash
npm install --global rea-agents
rea --help
```

For native analysis, configure a provider first. See the
[CLI and Evidence guide](docs/cli.md) for native commands, provider selection,
snapshots and scripting.

### Update REA

REA changes quickly, and new releases include frequent bug fixes. Keep your
installation up to date.

For a CLI installed with `npm install --global` or `bun add --global`:

```bash
rea update
```

`rea --update` is an alias for this verified workflow and accepts the same global
output flags. Use `rea update` when combining it with other command controls.

Updater commands retain at most 4 MiB of stdout and stderr combined. Oversized
metadata replies are rejected after the command exits; verbose installs continue
with bounded diagnostics. Human progress output respects terminal backpressure
and waits for submitted writes to finish.

Bun global updates require Bun 1.2.17 or later. With an older Bun release,
upgrade Bun manually before running `rea update`.

To refresh your agent registrations and skill, run the setup command printed
by the update.

If you use `npx`, update your agent setup with:

```bash
npx rea-agents@latest setup
```

Review the setup changes and restart your agent. For one-off CLI commands,
use `npx rea-agents@latest` followed by the command. With Bun, use
`bunx rea-agents@latest` in place of `npx rea-agents@latest`.

## How it works

Your agent calls REA through MCP to inspect the target and trace relevant code.
REA returns findings with their evidence. The agent uses them to ask follow-up
questions, explain the behavior, or write and test an implementation.
CLI commands use the same workflows.

![REA investigation flow: your agent asks about a local target, REA inspects and traces it using analysis tools, and the agent uses the returned code, references and unknowns to explain, implement and test.](website/public/assets/figures/rea-investigation-flow.svg)

[Open the full-size figure](website/public/assets/figures/rea-investigation-flow.svg).

<a id="current-status"></a>

## What you can analyze

REA requires Node.js 22.x (>=22.23.4), 24.x (>=24.22.1), or 26.12.1+, plus npm.
Additional tools and host support depend on the target:

| Target                  | What REA returns                                                                                  | Requirements and guide                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop installations   | Runtime candidates, supporting files, component markers and next probes                           | Built-in bounded directory/header inspection; [desktop applications](docs/desktop-applications.md)                                    |
| Native binaries         | Pseudocode, assembly, strings, symbols, calls and references                                      | Hopper, Ghidra or IDA; [native analysis](docs/native-investigation.md)                                                                |
| Offline ELF layout      | Sections, segments, original symbols/relocations and static mitigation candidates                 | Caller-supplied pwntools on Linux x64; [binary diagnostics](docs/binary-diagnostics.md)                                               |
| Go binaries             | Embedded compiler version, modules, replacements and build settings                               | Built-in static ELF/PE/thin Mach-O inspection; no Go installation required                                                            |
| GPU code objects        | CUDA/HIP targets, selected kernel parameters and resources, retained PTX text                     | Built-in static ELF/PE/fatbin/CUBIN/PTX inspection; [GPU code objects](docs/gpu-code-objects.md)                                      |
| Model artifacts         | GGUF / safetensors metadata, tensor declarations and derived totals                               | Built-in header inspection; optional full-file hash; [model files](docs/model-artifacts.md)                                           |
| IL2CPP metadata         | Unity global-metadata.dat assembly images, type and method names and index ranges                 | Built-in static decoding of versions 24, 27, 29, 31 and 39; no Unity required                                                         |
| Godot PCK               | Archive inventory and extraction, original header/directory facts and selected content identities | Built-in static formats 2, 3 and 4; no Godot required                                                                                 |
| Rust binaries           | Embedded cargo-auditable crate names, versions, sources and dependency edges                      | Built-in static ELF/PE/thin Mach-O inspection; [Rust binaries](docs/rust-binaries.md)                                                 |
| PE certificates         | Authenticode WIN_CERTIFICATE entries and PKCS#7 signer/X.509 identity fields                      | Built-in static PE inspection; [PE certificates](docs/pe-certificates.md)                                                             |
| PE imports              | Import and delay-load DLL names, ordinals, IAT RVAs and pefile import hash                        | Built-in static PE inspection; [PE imports](docs/pe-imports.md)                                                                       |
| ELF notes               | PT_NOTE/SHT_NOTE owners, types, GNU build-id and ABI-tag fields                                   | Built-in static ELF inspection; [ELF notes](docs/elf-notes.md)                                                                        |
| Apple IPS crashes       | .ips metadata, threads, images, registers and documented crash classes                            | Built-in static JSON inspection; [Apple IPS](docs/apple-ips.md)                                                                       |
| Linux kernel modules    | .modinfo keys, __versions CRCs, this_module presence, and signature trailer                       | Built-in static ELF inspection; [kernel modules](docs/kernel-modules.md)                                                              |
| Erlang BEAM             | IFF chunks, atoms, exports, imports, lambdas and the Code header                                  | Built-in static BEAM inspection; [Erlang BEAM](docs/erlang-beam.md)                                                                   |
| WASM artifact           | Validation, sections, exact import/export WAT forms and decoded WAT                               | Caller-supplied WABT 1.0.42; `inspect_wasm_artifact`                                                                                  |
| EVM bytecode            | Dispatch selectors, byte offsets, inferred arguments and mutability                               | Local raw/hex carrier on Linux x64; [offline EVM guide](docs/evm-bytecode.md)                                                         |
| SQLite databases        | Tables, columns, indexes, views, triggers and selected ordinary-table rows                        | Local database/WAL snapshot; Node.js 24.x >=24.15 or 26+ with native SQLite limits                                                    |
| Recorded Linux crashes  | Raw notes, every recorded thread's registers/signals and optional mapping candidates              | Caller-supplied pwntools on Linux x64; optional GDB/pwndbg; [recorded crashes](docs/recorded-crashes.md)                              |
| JavaScript / Electron   | Modules, imports, source maps, routes, IPC and native add-on relationships                        | Node.js and npm; Linux: procps-compatible `ps`; [application analysis](docs/javascript-application-workflows.md)                      |
| Websites                | Page structure, scripts, network observations and requested screenshots                           | A Chrome-family browser; [browser analysis](docs/browser-observation.md)                                                              |
| Saved network captures  | Requests, responses, exposed payloads and source locations                                        | HAR or Fiddler Everywhere SAZ; mitmdump on Linux for native mitmproxy; [capture guide](docs/web-network-captures.md)                  |
| .NET assemblies         | Metadata, CIL instructions, declared native dependencies and build comparisons                    | None (static only); [managed-code guide](docs/managed-code-analysis.md)                                                               |
| Android APKs            | Manifest declarations, classes, decompiled methods and references                                 | Headless JADX and a full JDK on Linux/macOS/Windows x64; [Android guide](docs/android-analysis.md)                                    |
| APK signatures          | v1/v2/v3/v3.1 signers, certificate fingerprints, key rotation and digest self-consistency         | None (static only); `inspect_apk_signature`                                                                                           |
| Android devices         | Devices, packages, processes, logs, dumps, screen captures, and APK/file transfers                | Caller-supplied adb (emulator or hardware); [ADB guide](docs/adb-device-analysis.md)                                                  |
| JEB projects            | Engine-backed project units, artifact digests and type/method pseudo-code                         | A caller-started JEB client serving MCP, selected with REA_JEB_MCP_URL; [JEB guide](docs/jeb-analysis.md)                             |
| Android resources       | Decoded manifest, string tables, locales and version facts                                        | Caller-supplied Apktool launcher; [resource guide](docs/apktool-resource-analysis.md)                                                 |
| Flutter apps            | Dart snapshot hash, per-ABI library digests and engine build provenance                           | None (static APK parsing); [Flutter guide](docs/flutter-analysis.md)                                                                  |
| Firmware                | Regions, extraction results and native-analysis handoffs                                          | Binwalk / Unblob on Linux; [firmware guide](docs/firmware-analysis.md)                                                                |
| Recorded packets        | Selected fields, repeated values, filters and decode-as rules                                     | Linux: TShark 4.x + prlimit; [capture guide](docs/packet-captures.md)                                                                 |
| Packet summaries        | Endpoints, DNS, TLS SNI, protocol distribution and HTTP requests                                  | Caller-supplied tshark and capinfos (Linux-verified); [pcap guide](docs/pcap-analysis.md)                                             |
| Recorded logic signals  | Decoder annotations, sample ranges and diagnostics                                                | Linux: sigrok-cli 0.7.2 + prlimit; [signal recordings](docs/signal-recordings.md)                                                     |
| Packages and resources  | File inventories, digests, plists, Apple bundle anatomy and extracted resources                   | [Artifact and JavaScript guide](docs/javascript-artifact-reconstruction.md), [Apple applications](docs/apple-application-analysis.md) |
| Process behavior        | Terminal output, interactions, exit and filesystem observations, and run comparisons              | Linux/macOS with a native PTY; [process capture](docs/process-capture.md)                                                             |
| PyInstaller executables | CArchive members, Python version, entry scripts and extracted bytecode                            | None (static only); [Python packaged applications](docs/python-packaged-applications.md)                                              |

Static JavaScript and .NET inspection read the supplied files without running
the application. Runtime capture runs or interacts with the selected target
using your user permissions; each runtime guide describes its effects.

For offline native-binary inspection, REA also supports caller-supplied GNU
objdump and Rizin. See the [reverse-engineering tools guide](docs/reverse-engineering-tools.md)
for provider setup, CLI commands, and Evidence limitations. REA does not install
or update either provider.

<a id="choosing-a-deep-analysis-provider"></a>

Native formats and host support vary by provider. See
[Hopper and Ghidra setup](docs/installation.md#hopper) for installation, or the
[Hopper notes](docs/installation.md#hopper) in the setup guide, the
[IDA guide](docs/ida-provider.md) (including an optional native MCP bridge), the
[Kuna decompiler guide](docs/kuna-provider.md), and
[experimental Windows Ghidra support](docs/windows-ghidra-p0.md).
Ghidra also supports [16-bit DOS analysis](docs/ghidra-dos.md).
For large binaries, raise the provider's startup deadline with
`REA_GHIDRA_STARTUP_TIMEOUT_MS` or `REA_HOPPER_STARTUP_TIMEOUT_MS`.
For provider selection, see the [CLI guide](docs/cli.md#choose-a-provider).
Check [release availability](docs/installation.md#released-package-and-main)
for features added since the latest npm release.

## Showcases

These case studies were produced with upstream REA and are the clearest
demonstration of what the shared workflow is for. They are the part of the product
this fork deliberately does not change.

<a href="https://rea.tools/showcase/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/rea-showcases-dark.svg" />
    <img alt="Illustrations of the DX-Ball sound-pan, Notion clipboard-bridge, and TH04 bullet-ring showcases" src="docs/assets/rea-showcases.svg" />
  </picture>
</a>

### DX-Ball: reconstruct a sound-pan calculation

Follow a sound call into its position-to-pan helper, inspect the instructions,
and turn incomplete pseudocode into C. The reconstruction passes 3,205
original-x86 cases and reproduces all 63 compiled function bytes.

[Read the case study](https://rea.tools/showcase/dx-ball/) ·
[Reconstruction repository](https://github.com/N0zoM1z0/dx-ball)

### Notion: trace the Electron clipboard bridge

Find the renderer's clipboard API, follow it through preload and IPC into the
main process, and inspect the rich clipboard format.

[Read the case study](https://rea.tools/showcase/notion/)

### TH04: recover a DOS bullet-ring calculation

Inspect the original PC-98 game's 16-bit instructions, recover the fixed and
aimed angle calculations, and compare the reconstructed C++ with the
historical compiler output.

[Read the case study](https://rea.tools/showcase/th04/) ·
[Reconstruction repository](https://github.com/N0zoM1z0/th04)

### Build RL environments with REA

Record a web app session, turn its API into tools, and export an environment an
AI agent can use. Run it with AgentEnv, then add tasks and reward checks for RL
training or evaluation. The
[RL-environment guide](https://rea.tools/guides/rl-environments/) walks through
the full loop.

If you've used REA on something interesting, share it in an
[issue](https://github.com/morluto/rea/issues) or
[pull request](https://github.com/morluto/rea/pulls). The
[RL guide](https://rea.tools/guides/rl-environments/) covers the full loop.

## FAQ

**Is this a different tool?** No. It is REA with a review pass and a test-first
fix set. The MCP tool names, schemas, CLI flags and package name are the
upstream ones; install it exactly as you install REA.

**Should I use this fork or upstream?** Upstream, unless you specifically want
the fixes and the verification trail recorded here. Every change is small,
reviewable and reproducible from the report and ledger linked under
[Documentation](#documentation).

**Does it change what my agent sees?** For REA's own 231 contracts, no: the
measured `tools/list` frame is byte-identical to the baseline. The schema fixes
only affect third-party schemas that use `contentSchema` or a mixed enum.

**Can it analyze everything upstream can?** Yes, with the same provider
requirements. Nothing was removed. What this host could not exercise is listed
as NOT RUN rather than claimed as passing — see §5 of
`docs/better-rea/FINAL_REPORT.md`.

**Quick start** and **Update REA** are above; **Documentation** is below.

## Build RL environments

Export a recorded session as an AgentEnv bundle, define tasks and reward checks,
then run the bundle with the AgentEnv runner. See the
[AgentEnv guide](docs/agent-environments.md).

## Keeping the fork current

The fork tracks upstream, so the update flow is unchanged. For a global
install:

```bash
rea update
```

For an `npx` setup, refresh the agent registration and skill after updating:

```bash
npx rea-agents@latest setup
```

## Documentation

Start with the [installation and setup guide](docs/installation.md#check-readiness-for-your-task),
then pick the guide for your target above. The
[CLI guide](docs/cli.md) covers every command and its output,
the [MCP contracts guide](docs/mcp-contracts.md#generated-catalog) covers tools,
schemas and the generated catalog, and
[MCP prompts](docs/mcp-prompts.md) covers the prompt surface.

Setup details, including
[supported agents](docs/installation.md#supported-agents) and the
[full installation guide](docs/installation.md), are kept in one place so the
fork does not restate them.

For this fork specifically:

- [Final report](docs/better-rea/FINAL_REPORT.md) — what changed and how it was verified
- [Progress ledger](docs/better-rea/PROGRESS.md) — every item, its status and its evidence
- [Baseline report](docs/better-rea/baseline-report.md) — the failures that predate the fork
- [Catalog benchmarks](docs/better-rea/benchmarks/mcp-catalog.md) — what `tools/list` costs per profile

The [roadmap](docs/roadmap.md) tracks what is planned next.

## Upstream and project links

Better-REA is unaffiliated with the upstream project; these links belong to it,
not to this fork.

- [Project website](https://rea.tools/) · [Guides](https://rea.tools/guides/)
- [npm package](https://www.npmjs.com/package/rea-agents)
- [Upstream issues](https://github.com/morluto/rea/issues) · [Upstream pull requests](https://github.com/morluto/rea/pulls)

## Disclaimer

Analysis runs under your user permissions and can execute or interact with the
target during runtime capture. Only analyze software you are allowed to inspect.
The full terms are in [DISCLAIMER.md](DISCLAIMER.md), and security reports go
through [SECURITY.md](SECURITY.md).

## Contributing

Contributions to the fork are welcome when they keep the public contract intact.
Read [CONTRIBUTING.md](CONTRIBUTING.md) for scope, the fail-closed integration
rule and the readiness requirements. Tests and provider claims follow
[the testing guide](docs/testing.md), and architecture changes should start from
[the architecture map](docs/architecture.mermaid).

Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

MIT. See [LICENSE](LICENSE).
