/**
 * Better-REA catalog identity snapshot (master §1.2 G-1).
 *
 * Records the sorted canonical MCP tool names and the six per-profile digests
 * that the compiled catalog owner computes, so a review can see exactly what an
 * advertised-catalog change touched. `--check` re-derives them and fails on
 * drift, which is the characterization check; the digests themselves come from
 * `createCatalogDigestProfiles`, not from a second interpretation here.
 *
 * Usage:
 *   node scripts/better-rea/snapshot-catalog-digests.mjs
 *   node scripts/better-rea/snapshot-catalog-digests.mjs --check
 *
 * Requires `npm run build:cached` first (this imports from `dist/`).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const target = join(
  repositoryRoot,
  "docs/better-rea/golden/mcp-catalog-digests.json",
);
const arguments_ = new Set(process.argv.slice(2));
for (const argument of arguments_)
  if (argument !== "--check")
    throw new Error(`Unknown catalog snapshot option: ${argument}`);

const load = (relativePath) =>
  import(pathToFileURL(join(repositoryRoot, "dist", relativePath)).href);
const [
  { createCatalogDigestProfiles },
  { TOOL_CONTRACTS },
  { compareUnicodeCodePoints },
] = await Promise.all([
  load("catalogIdentity.js"),
  load("contracts/toolContracts.js"),
  load("domain/unicodeCodePointOrder.js"),
]);

const tools = TOOL_CONTRACTS.map((contract) => contract.name).sort(
  compareUnicodeCodePoints,
);
const profiles = createCatalogDigestProfiles();
const snapshot = {
  version: 1,
  generated_by: "scripts/better-rea/snapshot-catalog-digests.mjs",
  method:
    "createCatalogDigestProfiles() over the compiled contracts: sha256 of the canonicalated advertised catalog per input/output schema profile. The tool list is sorted by Unicode code point.",
  tool_count: tools.length,
  tools,
  profiles,
};

if (arguments_.has("--check")) {
  const recorded = JSON.parse(await readFile(target, "utf8"));
  const differences = diff(recorded, snapshot);
  if (differences.length === 0) {
    process.stdout.write(
      `Catalog identity matches ${target} (${String(tools.length)} tools).\n`,
    );
  } else {
    process.stdout.write(
      `Catalog identity drift (${String(differences.length)}):\n${differences
        .map((path) => `  ${path}`)
        .join("\n")}\n`,
    );
    process.exitCode = 1;
  }
} else {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`);
  process.stdout.write(
    `Wrote ${target} (${String(tools.length)} tools, 6 profiles).\n`,
  );
}

/** Paths that differ, so a review names the profile instead of the whole file. */
function diff(left, right, path = "") {
  if (Object.is(left, right)) return [];
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return [path === "" ? "$" : path];
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) =>
    diff(left[key], right[key], path === "" ? key : `${path}.${key}`),
  );
}
