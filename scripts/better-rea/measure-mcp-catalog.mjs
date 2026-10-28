/**
 * Better-REA catalog measurement harness (CLI entry).
 *
 * Measures the real, production `tools/list` payload the compiled server emits
 * for every combination of the three advertisement settings a client chooses:
 *
 *   REA_MCP_INPUT_SCHEMA_PROFILE   full | compact (default)
 *   REA_MCP_OUTPUT_SCHEMA_PROFILE  full (default) | compact | off
 *   REA_MCP_TOOL_FAMILIES          absent (every tool) | one family
 *
 * `createServer` resolves all three from the environment it is given, so a
 * single process builds each variant in memory and reads the exact frame the
 * stdio transport would write.
 *
 * Usage:
 *   node scripts/better-rea/measure-mcp-catalog.mjs
 *   node scripts/better-rea/measure-mcp-catalog.mjs --no-families
 *   node scripts/better-rea/measure-mcp-catalog.mjs --json <path> --markdown <path>
 *
 * Requires `npm run build:cached` first (this imports from `dist/`).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  INPUT_PROFILES,
  measureVariant,
  OUTPUT_PROFILES,
  TOOL_FAMILY_IDS,
} from "./lib/mcp-catalog-measure.mjs";
import { buildReport, renderMarkdown } from "./lib/mcp-catalog-report.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const defaults = {
  json: join(repositoryRoot, "docs/better-rea/benchmarks/mcp-catalog.json"),
  markdown: join(repositoryRoot, "docs/better-rea/benchmarks/mcp-catalog.md"),
  families: true,
};

const parseArguments = (argv) => {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-families") {
      options.families = false;
      continue;
    }
    if (argument === "--json" || argument === "--markdown") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new Error(`${argument} requires a path`);
      options[argument.slice(2)] = resolve(repositoryRoot, value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return options;
};

/** Measure every input/output profile combination, in a stable order. */
const measureProfiles = async () => {
  const variants = [];
  for (const inputProfile of INPUT_PROFILES)
    for (const outputProfile of OUTPUT_PROFILES)
      variants.push(
        await measureVariant({
          inputProfile,
          outputProfile,
          families: undefined,
        }),
      );
  return variants;
};

/** Measure one family at a time, sequentially, because each owns a session. */
const measureFamilies = async () => {
  const groups = [];
  for (const inputProfile of INPUT_PROFILES) {
    const families = [];
    for (const family of TOOL_FAMILY_IDS)
      families.push(
        await measureVariant({
          inputProfile,
          outputProfile: "full",
          families: [family],
        }),
      );
    groups.push({
      input_profile: inputProfile,
      output_profile: "full",
      families,
    });
  }
  return groups;
};

const options = parseArguments(process.argv.slice(2));
const variants = await measureProfiles();
const familyVariants = options.families ? await measureFamilies() : [];
const report = buildReport({
  variants,
  familyVariants,
  familiesMeasured: options.families,
  nodeVersion: process.version,
});

await mkdir(dirname(options.json), { recursive: true });
await writeFile(options.json, `${JSON.stringify(report, null, 2)}\n`);
await mkdir(dirname(options.markdown), { recursive: true });
await writeFile(options.markdown, renderMarkdown(report, process.version));

const byProfile = (inputProfile, outputProfile) =>
  variants.find(
    (variant) =>
      variant.input_profile === inputProfile &&
      variant.output_profile === outputProfile,
  );
process.stdout.write(
  `Measured ${variants.length} profile variants${
    options.families
      ? ` and ${familyVariants.length} family sweeps (${TOOL_FAMILY_IDS.length} families each)`
      : ""
  }.\nDefault (compact/full) frame: ${byProfile("compact", "full")?.frame.bytes} bytes.\nComplete (full/full) frame: ${byProfile("full", "full")?.frame.bytes} bytes.\nWrote ${options.json}\nWrote ${options.markdown}\n`,
);
