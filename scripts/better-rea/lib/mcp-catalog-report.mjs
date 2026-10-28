/** Report assembly and Markdown rendering for the MCP catalog harness. */

export const percent = (part, whole) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const find = (variants, inputProfile, outputProfile) =>
  variants.find(
    (variant) =>
      variant.input_profile === inputProfile &&
      variant.output_profile === outputProfile,
  );

const format = (value) =>
  value === null || value === undefined ? "—" : value.toLocaleString("en-US");

/** Derive the comparison block, naming the exact variants compared. */
export const buildComparisons = (variants) => {
  const baseline = find(variants, "compact", "full");
  const complete = find(variants, "full", "full");
  const smallest = variants
    .filter((variant) => variant.output_profile === "off")
    .reduce((left, right) =>
      right.frame.bytes < left.frame.bytes ? right : left,
    );
  return {
    baseline,
    complete,
    smallest,
    comparisons: {
      default_vs_full_advertisement: {
        default_frame_bytes: baseline?.frame.bytes ?? null,
        full_frame_bytes: complete?.frame.bytes ?? null,
        saving_bytes:
          baseline === undefined || complete === undefined
            ? null
            : complete.frame.bytes - baseline.frame.bytes,
        saving_percent:
          baseline === undefined || complete === undefined
            ? null
            : percent(
                complete.frame.bytes - baseline.frame.bytes,
                complete.frame.bytes,
              ),
      },
      default_vs_smallest: {
        default_frame_bytes: baseline?.frame.bytes ?? null,
        smallest_frame_bytes: smallest.frame.bytes,
        smallest_variant: {
          input_profile: smallest.input_profile,
          output_profile: smallest.output_profile,
        },
        saving_bytes: (baseline?.frame.bytes ?? 0) - smallest.frame.bytes,
        saving_percent:
          baseline === undefined
            ? null
            : percent(
                baseline.frame.bytes - smallest.frame.bytes,
                baseline.frame.bytes,
              ),
      },
    },
  };
};

const summarizeTool = (tool) => ({
  name: tool.name,
  total_bytes: tool.total.bytes,
  input_schema_bytes: tool.input_schema.bytes,
  output_schema_bytes: tool.output_schema.bytes,
  description_bytes: tool.description_bytes,
  input_properties: tool.input_properties,
  has_output_schema: tool.has_output_schema,
  output_schema_definitions: tool.output_schema_structure?.definitions ?? 0,
});

const withoutToolDetail = (variant) => {
  const copy = { ...variant };
  delete copy.tools;
  return copy;
};

export const buildReport = ({
  variants,
  familyVariants,
  familiesMeasured,
  nodeVersion,
}) => {
  const baseline = find(variants, "compact", "full");
  return {
    version: 1,
    generated_by: "scripts/better-rea/measure-mcp-catalog.mjs",
    method: {
      frame:
        "UTF-8 bytes of the serialized JSON-RPC tools/list response the server transmits, excluding the trailing newline",
      token_estimates: [
        "estimated_tokens_by_four_bytes = ceil(bytes / 4); heuristic, not a tokenizer",
        "estimated_tokens_structural = count of identifier/punctuation runs after splitting camelCase; heuristic, not a tokenizer",
      ],
      profiles: {
        input: ["compact", "full"],
        output: ["full", "compact", "off"],
        families: familiesMeasured,
      },
      server:
        "dist/server/createServer.js over the SDK in-memory transport (production composition)",
    },
    node_version: nodeVersion,
    variants: variants.map(withoutToolDetail),
    // Full per-tool detail for the default profile only; the other profiles keep
    // their ten largest tools so the artifact stays reviewable.
    per_tool_default: (baseline?.tools ?? []).map(summarizeTool),
    family_variants: familyVariants.map((group) => ({
      ...group,
      families: group.families.map((family) => {
        const summary = withoutToolDetail(family);
        delete summary.largest_tools;
        return summary;
      }),
    })),
    comparisons: buildComparisons(variants).comparisons,
  };
};

const table = (rows, header) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

const profileRows = (variants) =>
  variants.map((variant) => [
    variant.input_profile,
    variant.output_profile,
    variant.tool_count,
    variant.tools_with_output_schema,
    format(variant.frame.bytes),
    format(variant.frame.estimated_tokens_by_four_bytes),
    format(variant.frame.estimated_tokens_structural),
    format(variant.result_payload.bytes),
    format(variant.input_schemas_total_bytes),
    format(variant.output_schemas_total_bytes),
    `${percent(variant.input_schemas_total_bytes, variant.result_payload.bytes)}% / ${percent(variant.output_schemas_total_bytes, variant.result_payload.bytes)}%`,
  ]);

const largestToolRows = (baseline) =>
  (baseline?.largest_tools ?? []).map((tool) => [
    `\`${tool.name}\``,
    format(tool.total.bytes),
    format(tool.input_schema.bytes),
    format(tool.output_schema.bytes),
    format(tool.description_bytes),
    tool.input_properties,
  ]);

const structureRows = (baseline) => {
  const structure = baseline?.output_schema_structure;
  const outputBytes = baseline?.output_schemas_total_bytes ?? 0;
  const frameBytes = baseline?.frame.bytes ?? 0;
  const largest = baseline?.largest_tools ?? [];
  return [
    [
      "Output `$defs` entries across the catalog",
      format(structure?.output_schema_definitions),
    ],
    [
      "Definitions unreachable from their schema root",
      `${format(structure?.unreachable_definitions)} (${format(structure?.unreachable_definition_bytes)} bytes)`,
    ],
    [
      "Repeated-subtree factoring ceiling",
      `${format(structure?.repeated_subtree_ceiling_bytes)} bytes (${percent(structure?.repeated_subtree_ceiling_bytes ?? 0, outputBytes)}% of output schema bytes)`,
    ],
    [
      "Largest single tool share of the default frame",
      `${percent(largest[0]?.total.bytes ?? 0, frameBytes)}% (\`${largest[0]?.name ?? "—"}\`)`,
    ],
    [
      "Ten largest tools share of the default frame",
      `${percent(
        largest.reduce((total, tool) => total + tool.total.bytes, 0),
        frameBytes,
      )}%`,
    ],
  ];
};

const familyRows = (familyVariants) => {
  const first = familyVariants[0]?.families ?? [];
  return [
    table(
      familyVariants.map((group) => [
        group.input_profile,
        format(
          group.families.reduce(
            (total, family) => total + family.tool_count,
            0,
          ),
        ),
        format(
          group.families.reduce(
            (total, family) => total + family.frame.bytes,
            0,
          ),
        ),
      ]),
      ["Input profile", "Total tools", "Total frame bytes"],
    ),
    "",
    table(
      first.map((family) => [
        family.families?.join(",") ?? "—",
        family.tool_count,
        format(family.frame.bytes),
        format(family.frame.estimated_tokens_by_four_bytes),
      ]),
      ["Family", "Tools", "Frame bytes", "Est. tokens (/4)"],
    ),
  ].join("\n");
};

/** Render the human-readable benchmark report. */
export const renderMarkdown = (report, nodeVersion) => {
  const { baseline, complete, smallest, comparisons } = buildComparisons(
    report.variants,
  );
  const hasFamilies = report.family_variants.length > 0;
  return `# MCP \`tools/list\` catalog measurements

Generated by \`scripts/better-rea/measure-mcp-catalog.mjs\` on Node ${nodeVersion}.
Regenerate with \`npm run build:cached\`, then:

\`\`\`powershell
node scripts/better-rea/measure-mcp-catalog.mjs
\`\`\`

## Method

- The measured bytes are the UTF-8 length of the serialized JSON-RPC
  \`tools/list\` **response frame** the compiled server transmits, excluding the
  trailing newline. Payload bytes (the \`result\` object alone) and per-tool bytes
  are reported separately because hosts may cap either.
- The server is the production composition (\`createBinarySession\` +
  \`createServer\`) driven over the SDK's in-memory transport, with a disposable
  \`HOME\`. No provider is launched and no target is opened.
- Token counts are **ESTIMATES** from two independent heuristics. No tokenizer
  ran, so no *measured* token count appears here.

| Profile | Meaning |
| --- | --- |
| \`REA_MCP_INPUT_SCHEMA_PROFILE=compact\` | Default. Bounded input schemas, 13312-byte per-schema budget. |
| \`REA_MCP_INPUT_SCHEMA_PROFILE=full\` | Complete advertised input guidance. |
| \`REA_MCP_OUTPUT_SCHEMA_PROFILE=full\` | Default. Complete output contracts. |
| \`REA_MCP_OUTPUT_SCHEMA_PROFILE=compact\` | 4096-byte per-schema output budget. |
| \`REA_MCP_OUTPUT_SCHEMA_PROFILE=off\` | Output schemas omitted from the advertisement; validation and structured content unchanged. |

## Default and extreme profiles (every tool advertised)

${table(profileRows(report.variants), [
  "input",
  "output",
  "tools",
  "with output schema",
  "frame bytes",
  "est. tokens (/4)",
  "est. tokens (structural)",
  "result bytes",
  "input schemas",
  "output schemas",
  "input / output share",
])}

## Default profile versus complete advertisement

| Comparison | Bytes | Saving |
| --- | --- | --- |
| Default (\`${baseline?.input_profile}/${baseline?.output_profile}\`) frame | ${format(comparisons.default_vs_full_advertisement.default_frame_bytes)} | — |
| Complete (\`${complete?.input_profile}/${complete?.output_profile}\`) frame | ${format(comparisons.default_vs_full_advertisement.full_frame_bytes)} | ${format(comparisons.default_vs_full_advertisement.saving_bytes)} bytes (${comparisons.default_vs_full_advertisement.saving_percent}%) |
| Smallest advertised frame (\`${smallest?.input_profile}/${smallest?.output_profile}\`) | ${format(comparisons.default_vs_smallest.smallest_frame_bytes)} | ${format(comparisons.default_vs_smallest.saving_bytes)} bytes versus default (${comparisons.default_vs_smallest.saving_percent}%) |

## Largest tools at the default profile

${table(largestToolRows(baseline), [
  "Tool",
  "Total",
  "Input schema",
  "Output schema",
  "Description",
  "Input properties",
])}

## Schema structure at the default profile

The output contracts are already emitted with a shared \`$defs\` table, so the
question for deduplication work is whether anything is left to factor out.

${table(structureRows(baseline), ["Measurement", "Value"])}

The repeated-subtree ceiling counts nested overlaps more than once, so it is an
upper bound on what intra-schema \`$ref\` factoring could save, not an achievable
saving.

${
  hasFamilies
    ? `## Per-family frames (output profile \`full\`)

Each row advertises exactly one family, so the totals approximate one workflow
at a time.

${familyRows(report.family_variants)}`
    : "## Per-family frames\n\nNot measured in this run (`--no-families`)."
}

Machine-readable output: \`docs/better-rea/benchmarks/mcp-catalog.json\`.
`;
};
