import { Ajv2020 } from "ajv/dist/2020.js";
import { expect, it } from "vitest";
import { unsupportedInputLiteralSchemaError } from "../../tests/fixtures/mcpClientSchemaConstraints.js";
import { presentInputJsonSchema } from "./inputSchemaPresentation.js";

const present = (schema: Record<string, unknown>): Record<string, unknown> =>
  presentInputJsonSchema(structuredClone(schema), () => undefined);
const validate = (schema: Record<string, unknown>) =>
  new Ajv2020({ strict: false }).compile(schema);

it("widens contentSchema literals like any other schema child", () => {
  const schema = present({
    type: "object",
    properties: {
      value: { type: "string", contentSchema: { const: "" } },
      nested: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { type: "string", contentSchema: { const: "" } },
          },
        },
      },
    },
  });
  expect(schema.properties).toEqual({
    value: { type: "string", contentSchema: { type: "string" } },
    nested: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { type: "string", contentSchema: { type: "string" } },
        },
      },
    },
  });
  // The canonical empty string stays accepted after widening.
  expect(validate(schema)({ value: "", nested: { items: [""] } })).toBe(true);
});

it("keeps the member types of a mixed enum that contains the empty string", () => {
  const schema = present({
    type: "object",
    properties: { mixed: { enum: ["", 1] } },
    required: ["mixed"],
  });
  expect(schema.properties).toEqual({ mixed: { type: ["string", "number"] } });
  const validateAdvertised = validate(schema);
  for (const value of ["", "text", 1, 2.5])
    expect(validateAdvertised({ mixed: value })).toBe(true);
  for (const value of [true, null, {}, ["x"]])
    expect(validateAdvertised({ mixed: value })).toBe(false);
});

it("keeps the single member type of an all-string enum", () => {
  expect(
    present({ type: "object", properties: { mode: { enum: ["", "fast"] } } })
      .properties,
  ).toEqual({ mode: { type: "string" } });
});

it("reaches contentSchema literals from the client-constraint walk", () => {
  expect(
    unsupportedInputLiteralSchemaError(
      {
        type: "object",
        properties: {
          value: { type: "string", contentSchema: { const: "" } },
        },
      },
      "tool",
    ),
  ).toBe("tool.properties.value.contentSchema.const is an empty string");
});
