export const schemaMaps = new Set([
  "$defs",
  "definitions",
  "properties",
  "patternProperties",
  "dependentSchemas",
  "dependencies",
]);
export const schemaArrays = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
export const schemaChildren = new Set([
  "items",
  "additionalItems",
  "contains",
  "additionalProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "propertyNames",
  "not",
  "if",
  "then",
  "else",
  // Draft 2020-12 string content schema; its value is a schema like `items`.
  "contentSchema",
]);

/** Instance values, unless explicitly reached by a schema reference. */
export const schemaLiteralValues = new Set([
  "const",
  "enum",
  "default",
  "examples",
]);
