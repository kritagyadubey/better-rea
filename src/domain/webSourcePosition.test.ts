import { expect, it } from "vitest";
import {
  webSourceOffset,
  webSourcePositionOutcome,
} from "./webSourcePosition.js";

it("uses UTF-16 columns and actual JavaScript line terminators", () => {
  const text = "🎋a\r\nb\rc\nd\u2028e\u2029";
  expect(webSourceOffset(text, { line: 1, column: 2 })).toBe(2);
  expect(webSourceOffset(text, { line: 1, column: 3 })).toBe(3);
  expect(webSourceOffset(text, { line: 1, column: 4 })).toBeUndefined();
  expect(webSourceOffset(text, { line: 2, column: 0 })).toBe(5);
  expect(webSourceOffset(text, { line: 6, column: 0 })).toBe(13);
  expect(webSourceOffset(text, { line: 7, column: 0 })).toBeUndefined();
});

it.each([
  { line: 0, column: 0 },
  { line: 1, column: -1 },
  { line: 1.5, column: 0 },
])("rejects invalid source positions: %j", (position) => {
  expect(webSourceOffset("", position)).toBeUndefined();
});

it("retains the empty source and the final empty line", () => {
  expect(webSourceOffset("", { line: 1, column: 0 })).toBe(0);
  expect(webSourceOffset("a\r\n", { line: 2, column: 0 })).toBe(3);
});

it("reports the retained line count for a line past the last line", () => {
  expect(webSourcePositionOutcome("a\r\nb\nc", { line: 4, column: 0 })).toEqual(
    { kind: "out_of_range", coordinate: "line", minimum: 1, maximum: 3 },
  );
  // A trailing terminator starts a final, empty line.
  expect(webSourcePositionOutcome("a\n", { line: 3, column: 0 })).toEqual({
    kind: "out_of_range",
    coordinate: "line",
    minimum: 1,
    maximum: 2,
  });
  expect(webSourcePositionOutcome("", { line: 2, column: 0 })).toEqual({
    kind: "out_of_range",
    coordinate: "line",
    minimum: 1,
    maximum: 1,
  });
});

it("reports the selected line's UTF-16 length for a column past its end", () => {
  const text = "🎋a\r\nb\rc\nd\u2028e\u2029";
  expect(webSourcePositionOutcome(text, { line: 1, column: 4 })).toEqual({
    kind: "out_of_range",
    coordinate: "column",
    minimum: 0,
    maximum: 3,
  });
  expect(webSourcePositionOutcome(text, { line: 7, column: 0 })).toEqual({
    kind: "out_of_range",
    coordinate: "line",
    minimum: 1,
    maximum: 6,
  });
  expect(webSourcePositionOutcome(text, { line: 6, column: 1 })).toEqual({
    kind: "out_of_range",
    coordinate: "column",
    minimum: 0,
    maximum: 0,
  });
  expect(webSourcePositionOutcome(text, { line: 6, column: 0 })).toEqual({
    kind: "resolved",
    offset: 13,
  });
});

it("separates malformed coordinates from retained-text bounds", () => {
  expect(webSourcePositionOutcome("abc", { line: 0, column: 0 })).toEqual({
    kind: "invalid",
  });
  expect(webSourcePositionOutcome("abc", { line: 1, column: -1 })).toEqual({
    kind: "invalid",
  });
  expect(webSourcePositionOutcome("abc", { line: 1.5, column: 0 })).toEqual({
    kind: "invalid",
  });
  expect(
    webSourcePositionOutcome("abc", {
      line: Number.MAX_SAFE_INTEGER + 1,
      column: 0,
    }),
  ).toEqual({ kind: "invalid" });
});
