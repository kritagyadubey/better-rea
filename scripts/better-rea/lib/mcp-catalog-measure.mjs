/**
 * Measurement primitives for the Better-REA MCP catalog harness.
 *
 * Every function here treats the compiled server as the source of truth: it
 * builds the production composition, asks the SDK client for `tools/list`, and
 * measures the frame the server actually serialized.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Client,
  InMemoryTransport,
  serializeMessage,
} from "@modelcontextprotocol/client";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const compiled = join(repositoryRoot, "dist");
const importDist = (name) => import(pathToFileURL(join(compiled, name)).href);

const [
  { createServer },
  { createBinarySession },
  { parseConfig },
  { silentLogger },
  { TOOL_FAMILY_IDS },
] = await Promise.all([
  importDist("server/createServer.js"),
  importDist("composition/binary.js"),
  importDist("config/parseConfig.js"),
  importDist("logger.js"),
  importDist("contracts/toolFamilyIds.js"),
]);

export { TOOL_FAMILY_IDS };

export const OUTPUT_PROFILES = ["full", "compact", "off"];
export const INPUT_PROFILES = ["compact", "full"];

export const utf8Bytes = (text) => Buffer.byteLength(text, "utf8");

/**
 * ESTIMATE: JSON schema text averages close to four UTF-8 bytes per token for
 * the mixed identifier and punctuation content in these schemas. This is a
 * heuristic, not a measurement.
 */
const estimateTokensByFourBytes = (bytes) => Math.ceil(bytes / 4);

/**
 * ESTIMATE: a structural approximation that splits identifiers on camelCase,
 * snake_case, digits and punctuation. It is deliberately independent of the
 * four-bytes rule, so disagreement between the two indicates the answer is
 * uncertain rather than precise.
 */
const estimateStructuralTokens = (text) =>
  text
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .split(/[^A-Za-z0-9]+/u)
    .filter((part) => part.length > 0).length;

export const summarize = (text) => {
  const bytes = utf8Bytes(text);
  return {
    bytes,
    estimated_tokens_by_four_bytes: estimateTokensByFourBytes(bytes),
    estimated_tokens_structural: estimateStructuralTokens(text),
  };
};

const canonicalJson = (value) =>
  Array.isArray(value)
    ? value.map(canonicalJson)
    : value !== null && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            )
            .map(([key, entry]) => [key, canonicalJson(entry)]),
        )
      : value;

const collectReferences = (node, found) => {
  if (Array.isArray(node)) {
    for (const entry of node) collectReferences(entry, found);
    return found;
  }
  if (node === null || typeof node !== "object") return found;
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/"))
    found.add(
      decodeURIComponent(
        node.$ref
          .slice("#/$defs/".length)
          .replaceAll("~1", "/")
          .replaceAll("~0", "~"),
      ),
    );
  for (const value of Object.values(node)) collectReferences(value, found);
  return found;
};

const reachableDefinitions = (schema, definitions) => {
  const roots = collectReferences(schema, new Set());
  for (const [key, value] of Object.entries(schema))
    if (key !== "$defs") collectReferences(value, roots);
  const reachable = new Set();
  const pending = [...roots];
  while (pending.length > 0) {
    const name = pending.pop();
    if (reachable.has(name) || definitions[name] === undefined) continue;
    reachable.add(name);
    for (const next of collectReferences(definitions[name], new Set()))
      pending.push(next);
  }
  return reachable;
};

const repeatedSubtreeCeiling = (schema) => {
  const occurrences = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const text = JSON.stringify(canonicalJson(node));
    if (text.length > 200)
      occurrences.set(text, (occurrences.get(text) ?? 0) + 1);
    for (const value of Object.values(node)) walk(value);
  };
  walk(schema);
  return [...occurrences.entries()].reduce(
    (total, [text, count]) => total + text.length * (count - 1),
    0,
  );
};

/**
 * Structural analysis of one JSON Schema: how much of it is a shared `$defs`
 * table, whether every definition is reachable from the root, and an upper
 * bound on what intra-schema `$defs` factoring of repeated subtrees could save.
 * Nested overlaps are counted more than once, so the last number is a ceiling
 * rather than an achievable saving.
 */
export const analyzeSchema = (schema) => {
  if (schema === undefined) return null;
  const definitions = schema.$defs ?? {};
  const definitionNames = Object.keys(definitions);
  const reachable = reachableDefinitions(schema, definitions);
  const unreachable = definitionNames.filter((name) => !reachable.has(name));
  return {
    bytes: utf8Bytes(JSON.stringify(schema)),
    definitions: definitionNames.length,
    references: collectReferences(schema, new Set()).size,
    unreachable_definitions: unreachable.length,
    unreachable_definition_bytes: unreachable.reduce(
      (total, name) =>
        total + utf8Bytes(JSON.stringify({ [name]: definitions[name] })),
      0,
    ),
    repeated_subtree_ceiling_bytes: repeatedSubtreeCeiling(schema),
  };
};

const describeTool = (tool) => {
  const inputText =
    tool.inputSchema === undefined ? "" : JSON.stringify(tool.inputSchema);
  const outputText =
    tool.outputSchema === undefined ? "" : JSON.stringify(tool.outputSchema);
  return {
    name: tool.name,
    total: summarize(JSON.stringify(tool)),
    input_schema: summarize(inputText),
    output_schema: summarize(outputText),
    output_schema_structure: analyzeSchema(tool.outputSchema),
    description_bytes: utf8Bytes(tool.description ?? ""),
    input_properties: Object.keys(tool.inputSchema?.properties ?? {}).length,
    has_output_schema: tool.outputSchema !== undefined,
  };
};

const aggregateStructure = (perTool) => {
  const structures = perTool
    .map((tool) => tool.output_schema_structure)
    .filter((structure) => structure !== null);
  const sum = (select) =>
    structures.reduce((total, structure) => total + select(structure), 0);
  return {
    output_schema_definitions: sum((structure) => structure.definitions),
    unreachable_definitions: sum(
      (structure) => structure.unreachable_definitions,
    ),
    unreachable_definition_bytes: sum(
      (structure) => structure.unreachable_definition_bytes,
    ),
    repeated_subtree_ceiling_bytes: sum(
      (structure) => structure.repeated_subtree_ceiling_bytes,
    ),
  };
};

/** Run one server variant inside a disposable home and release everything. */
const withDisposableVariant = async (environment, run) => {
  const home = await mkdtemp(join(tmpdir(), "rea-better-catalog-"));
  const scoped = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: join(home, "config"),
    XDG_CACHE_HOME: join(home, "cache"),
    XDG_STATE_HOME: join(home, "state"),
    ...environment,
  };
  const cleanup = [];
  let failure;
  let value;
  try {
    const config = parseConfig(scoped);
    if (!config.ok) throw config.error;
    const session = createBinarySession(config.value, silentLogger, scoped);
    cleanup.push(async () => {
      const closed = await session.close({ retainProviderDocuments: true });
      if (!closed.ok) throw closed.error;
    });
    const server = createServer(
      { kind: "session", session },
      {
        environment: scoped,
      },
    );
    cleanup.push(() => server.close());
    const client = new Client({ name: "rea-better-catalog", version: "1" });
    cleanup.push(() => client.close());
    value = await run({ server, client });
  } catch (cause) {
    failure = cause;
  }
  const results = await Promise.allSettled(
    cleanup.reverse().map((close) => Promise.resolve().then(close)),
  );
  const cleanupFailures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  if (cleanupFailures.length === 0) {
    try {
      await rm(home, { recursive: true, force: true });
    } catch (cause) {
      cleanupFailures.push(cause);
    }
  }
  if (failure !== undefined || cleanupFailures.length > 0)
    throw new AggregateError(
      failure === undefined ? cleanupFailures : [failure, ...cleanupFailures],
      `Catalog measurement cleanup may be incomplete; temporary home: ${home}`,
    );
  return value;
};

/** Measure one input/output/family variant of the real `tools/list` frame. */
export const measureVariant = ({ inputProfile, outputProfile, families }) =>
  withDisposableVariant(
    {
      REA_MCP_INPUT_SCHEMA_PROFILE: inputProfile,
      REA_MCP_OUTPUT_SCHEMA_PROFILE: outputProfile,
      ...(families === undefined
        ? {}
        : { REA_MCP_TOOL_FAMILIES: families.join(",") }),
    },
    async ({ server, client }) => {
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      // Capture the frame the server serializes, before the in-memory link
      // hands the parsed message to the client. Patch the instance (not a
      // subclass) so `_otherTransport` stays linked in both directions.
      let lastFrame;
      const sendToClient = serverTransport.send.bind(serverTransport);
      serverTransport.send = (message, sendOptions) => {
        if (message?.id !== undefined && message?.result !== undefined)
          lastFrame = serializeMessage(message);
        return sendToClient(message, sendOptions);
      };
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const { tools } = await client.listTools();
      if (lastFrame === undefined)
        throw new Error("No tools/list response frame was captured");

      const frame = lastFrame.replace(/\n$/u, "");
      const result = JSON.parse(frame).result;
      const perTool = tools
        .map(describeTool)
        .sort((left, right) => right.total.bytes - left.total.bytes);
      const inputTotal = perTool.reduce(
        (total, tool) => total + tool.input_schema.bytes,
        0,
      );
      const outputTotal = perTool.reduce(
        (total, tool) => total + tool.output_schema.bytes,
        0,
      );
      const resultText = JSON.stringify(result);
      return {
        input_profile: inputProfile,
        output_profile: outputProfile,
        families: families ?? null,
        tool_count: tools.length,
        tools_with_output_schema: perTool.filter(
          (tool) => tool.has_output_schema,
        ).length,
        frame: summarize(frame),
        result_payload: summarize(resultText),
        tools_array: summarize(JSON.stringify(result.tools ?? [])),
        input_schemas_total_bytes: inputTotal,
        output_schemas_total_bytes: outputTotal,
        overhead_bytes: utf8Bytes(resultText) - inputTotal - outputTotal,
        output_schema_structure: aggregateStructure(perTool),
        largest_tools: perTool.slice(0, 10),
        tools: perTool,
      };
    },
  );
